import crypto from 'node:crypto'
import { registerAccountMethods } from './account-methods.js'
import argon2 from 'argon2'
import { accountConfig, digest, pkce, normalizePhone, localRedirect, verifyCaptcha, authorizationUrl, oauthIdentity } from './auth-providers.js'
import { normalizeEmail, emailCodeHash, consumeEmailCode, sendVerificationEmail } from './email-verification.js'
import { safeEqual } from './cloud-sync.js'

export function registerUnifiedAuth(app, pool, { origin, cookieName, secret, currentUser, requireUser, publicUser, createSession, syncAutomaticBadges }, services = {}) {
  const providers = { verifyCaptcha, oauthIdentity, sendVerificationEmail, ...services }
  const failure = (reply, status, message) => reply.code(status).send({ message })
  const limit = (max, timeWindow = '15 minutes') => ({ config:{ rateLimit:{ max, timeWindow } } })
  async function transaction(fn) {
    const db = await pool.connect()
    try { await db.query('BEGIN'); const result = await fn(db); await db.query('COMMIT'); return result }
    catch (e) { await db.query('ROLLBACK'); throw e } finally { db.release() }
  }
  async function captcha(param) {
    try { return await providers.verifyCaptcha(param) } catch { return false }
  }
  const methods = registerAccountMethods(app,pool,{secret,cookieName,requireUser,publicUser,createSession,syncAutomaticBadges},{transaction,captcha},services)
  app.get('/api/auth/config', async () => accountConfig())
  app.get('/api/auth/email/status',async(req,reply) => {
    const user=await requireUser(req,reply); if(!user) return
    return {email:user.email || null,verified:!!user.email_verified_at}
  })
  app.post('/api/auth/email/send',limit(5),async(req,reply) => {
    if (!accountConfig().emailVerification) return failure(reply,503,'邮件验证尚未配置。')
    const email = normalizeEmail(req.body?.email), purpose = req.body?.purpose
    if (!email || !['register','reset','verify','bind','manage'].includes(purpose)) return failure(reply,400,'邮箱或验证用途无效。')
    let owner = null
    if (['bind','manage'].includes(purpose)) {
      owner = purpose === 'bind' ? await methods.requireFresh(req,reply) : await requireUser(req,reply); if(!owner) return
      if(purpose === 'manage' && (normalizeEmail(owner.email)!==email || !owner.email_verified_at)) return failure(reply,400,'请使用当前账号已验证的邮箱。')
    }
    if (purpose === 'verify') {
      const user = await requireUser(req,reply); if(!user) return
      if (normalizeEmail(user.email) !== email) return failure(reply,400,'请验证当前账号绑定的邮箱。')
    }
    if (accountConfig().captchaRequired && !await captcha(req.body?.captchaVerifyParam)) return failure(reply,400,'请先完成安全验证。')
    const id=crypto.randomUUID(), code=crypto.randomInt(0,1000000).toString().padStart(6,'0')
    const ipHash=crypto.createHmac('sha256',secret).update(req.ip).digest('hex')
    const reserved=await transaction(async db => {
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`email-ip:${ipHash}`])
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`email-address:${email}`])
      const {rows}=await db.query(`SELECT
        COUNT(*) FILTER(WHERE email=$1 AND created_at>NOW()-INTERVAL '60 seconds') AS recent,
        COUNT(*) FILTER(WHERE email=$1) AS daily, COUNT(*) FILTER(WHERE ip_hash=$2) AS ip_daily
        FROM auth_email_challenges WHERE created_at>NOW()-INTERVAL '1 day' AND (email=$1 OR ip_hash=$2)`,[email,ipHash])
      if (+rows[0].recent || +rows[0].daily >= 10 || +rows[0].ip_daily >= 30) return false
      await db.query(`INSERT INTO auth_email_challenges(id,email,purpose,code_hash,ip_hash,user_id,expires_at) VALUES($1,$2,$3,$4,$5,$6,NOW()+INTERVAL '5 minutes')`,[id,email,purpose,emailCodeHash(secret,id,email,purpose,code),ipHash,owner?.id || null])
      return true
    })
    if(!reserved) return failure(reply,429,'邮件发送过于频繁，请稍后重试。')
    try {
      await providers.sendVerificationEmail(email,code,purpose)
      await transaction(async db => {
        await db.query('UPDATE auth_email_challenges SET sent=TRUE WHERE id=$1',[id])
        await db.query('UPDATE auth_email_challenges SET used_at=NOW() WHERE email=$1 AND purpose=$2 AND id<>$3 AND used_at IS NULL',[email,purpose,id])
      })
      return {challengeId:id,retryAfter:60,expiresIn:300,message:'验证码已发送，请检查收件箱或垃圾邮件。'}
    } catch { return failure(reply,503,'邮件发送失败，请稍后重试。') }
  })
  app.post('/api/auth/email/verify',limit(5),async(req,reply) => {
    if(!accountConfig().emailVerification) return failure(reply,503,'邮件验证尚未配置。')
    const user=await requireUser(req,reply); if(!user) return
    const email=normalizeEmail(user.email)
    if(!email) return failure(reply,400,'当前账号未绑定邮箱。')
    const valid=await transaction(async db => {
      if(!await consumeEmailCode(db,secret,{...req.body,email,purpose:'verify'})) return false
      await db.query('UPDATE users SET email_verified_at=NOW(),updated_at=NOW() WHERE id=$1',[user.id])
      return true
    })
    return valid ? {ok:true} : failure(reply,400,'验证码无效、已使用或已过期。')
  })
  app.post('/api/auth/register', limit(5), async (req, reply) => {
    const { username, displayName, password, email } = req.body || {}
    if (req.body?.phone) return methods.registerPhone(req,reply)
    if (!/^[A-Za-z0-9_-]{3,24}$/.test(username || '') || typeof displayName !== 'string' || !displayName.trim() || displayName.trim().length > 40) return failure(reply,400,'请检查用户名和昵称。')
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) return failure(reply,400,'密码长度应为 8～128 位。')
    if (!normalizeEmail(email)) return failure(reply,400,'邮箱格式有误。')
    const requireEmail = accountConfig().emailVerification
    if (!requireEmail && accountConfig().captchaRequired && !await captcha(req.body?.captchaVerifyParam)) return failure(reply,400,'请先完成安全验证。')
    const passwordHash = await argon2.hash(password,{ type:argon2.argon2id })
    try {
      const user = await transaction(async db => {
        if (requireEmail && !await consumeEmailCode(db,secret,{...req.body,email:normalizeEmail(email),purpose:'register'})) return null
        const { rows } = await db.query(`INSERT INTO users(username,email,password_hash,display_name,email_verified_at) VALUES($1,$2,$3,$4,CASE WHEN $5 THEN NOW() END) RETURNING *`,[username,normalizeEmail(email),passwordHash,displayName.trim(),requireEmail])
        await db.query(`INSERT INTO contribution_events(user_id,type,points,reason) VALUES($1,'ACCOUNT_CREATED',5,'Account created')`,[rows[0].id])
        await syncAutomaticBadges(rows[0].id,db)
        return rows[0]
      })
      if (!user) return failure(reply,400,'验证码无效、已使用或已过期。')
      await createSession(user.id,reply,req)
      return reply.code(201).send({ user:await publicUser(user) })
    } catch (e) { if (e.code === '23505') return failure(reply,409,'用户名或联系方式已被使用。'); throw e }
  })
  // Hash once for unknown identities to avoid skipping expensive verification.
  const dummyHash = argon2.hash(crypto.randomBytes(32),{ type:argon2.argon2id })
  async function passwordLogin(req,reply,native) {
    const identifier = req.body?.identifier ?? req.body?.email
    const password = req.body?.password
    if (typeof identifier !== 'string' || identifier.length > 254 || typeof password !== 'string' || password.length > 128) return failure(reply,400,'请输入邮箱／手机号和密码。')
    if (accountConfig().captchaRequired && (native || !await captcha(req.body?.captchaVerifyParam))) return failure(reply,428,'请在安全登录页面完成验证。')
    const phone = normalizePhone(identifier)
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1 OR (phone=$2 AND phone_verified_at IS NOT NULL)',[identifier.trim().toLowerCase(),phone])
    const user = rows[0]
    const valid = await argon2.verify(user?.password_hash || await dummyHash,password)
    if (!user?.password_hash || !valid) return failure(reply,401,'账号或密码不正确。')
    const token = await createSession(user.id,reply,req,native)
    return { user:await publicUser(user), ...(native ? { token } : {}) }
  }
  app.post('/api/auth/login',limit(8),(req,reply) => passwordLogin(req,reply,false))
  app.post('/api/auth/native/login',limit(8),(req,reply) => passwordLogin(req,reply,true))
  app.post('/api/auth/password/reset',limit(5),async(req,reply) => {
    if(!accountConfig().passwordReset) return failure(reply,503,'密码找回将在邮件验证服务接入后开放。')
    const email=normalizeEmail(req.body?.email), password=req.body?.password
    if(!email || typeof password !== 'string' || password.length<8 || password.length>128) return failure(reply,400,'请输入邮箱、验证码及 8～128 位新密码。')
    const hash=await argon2.hash(password,{type:argon2.argon2id})
    const valid=await transaction(async db => {
      if(!await consumeEmailCode(db,secret,{...req.body,email,purpose:'reset'})) return false
      const {rows}=await db.query('UPDATE users SET password_hash=$1,email_verified_at=NOW(),updated_at=NOW() WHERE email=$2 RETURNING id',[hash,email])
      if(rows[0]) {
        await db.query('DELETE FROM sessions WHERE user_id=$1',[rows[0].id])
        await db.query('DELETE FROM auth_app_requests WHERE user_id=$1',[rows[0].id])
        await db.query('DELETE FROM auth_oauth_states WHERE link_user_id=$1',[rows[0].id])
      }
      return true
    })
    if(!valid) return failure(reply,400,'验证码无效、已使用或已过期。')
    reply.clearCookie(cookieName,{path:'/'})
    return {ok:true,message:'如该邮箱已注册，密码已更新，请重新登录。'}
  })
  function enabled(provider) { return accountConfig().providers.some(p => p.id === provider && p.enabled) }
  async function startOAuth(req,reply,linkUser = null) {
    const provider = req.params.provider
    const purpose = linkUser ? (req.body?.reauth === true ? 'reauth' : 'link') : 'login'
    if (!enabled(provider)) return failure(reply,503,'该第三方登录尚未配置。')
    const state = crypto.randomBytes(32).toString('base64url'), verifier = crypto.randomBytes(32).toString('base64url'), nonce = crypto.randomBytes(32).toString('base64url')
    await pool.query(`INSERT INTO auth_oauth_states(state_hash,provider,verifier,nonce,redirect_path,link_user_id,purpose,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,NOW()+INTERVAL '10 minutes')`,[digest(state),provider,verifier,nonce,localRedirect(req.query.redirect || req.body?.redirect),linkUser,purpose])
    reply.setCookie('yuashie_oauth',state,{ path:'/api/auth/oauth',httpOnly:true,secure:process.env.NODE_ENV === 'production',sameSite:'lax',maxAge:600 })
    const url = authorizationUrl(provider,origin,state,verifier,nonce)
    return linkUser ? { url } : reply.redirect(url)
  }
  app.get('/api/auth/oauth/:provider/start',limit(10),startOAuth)
  app.post('/api/auth/oauth/:provider/link',limit(5),async (req,reply) => {
    const user = req.body?.reauth === true ? await requireUser(req,reply) : await methods.requireFresh(req,reply); if (!user) return
    return startOAuth(req,reply,user.id)
  })
  app.get('/api/auth/oauth/:provider/callback',limit(20),async (req,reply) => {
    const { provider } = req.params, { state, code } = req.query
    if (!enabled(provider) || typeof state !== 'string' || !safeEqual(req.cookies.yuashie_oauth,state) || typeof code !== 'string' || code.length > 4096) return failure(reply,400,'授权已取消或已过期，请重新登录。')
    const { rows } = await pool.query('DELETE FROM auth_oauth_states WHERE state_hash=$1 AND provider=$2 AND expires_at>NOW() RETURNING *',[digest(state),provider])
    reply.clearCookie('yuashie_oauth',{ path:'/api/auth/oauth' })
    const record = rows[0]
    if (!record) return failure(reply,400,'授权已过期，请重新登录。')
    if (record.link_user_id && String((await currentUser(req))?.id) !== String(record.link_user_id)) return failure(reply,403,'登录账号已变化，请重新绑定。')
    try {
      const identity = await providers.oauthIdentity(provider,code,record,origin)
      const user = await transaction(async db => {
        await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`${provider}:${identity.subject}`])
        if(record.link_user_id) await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[record.link_user_id])
        const existing = await db.query('SELECT u.* FROM auth_identities i JOIN users u ON u.id=i.user_id WHERE provider=$1 AND subject=$2',[provider,identity.subject])
        if (existing.rows[0]) {
          if (record.link_user_id && String(existing.rows[0].id) !== String(record.link_user_id)) throw new Error('Identity already linked')
          return existing.rows[0]
        }
        if(record.purpose === 'reauth') throw new Error('Identity does not belong to this account')
        let user
        if (record.link_user_id) user = (await db.query('SELECT * FROM users WHERE id=$1',[record.link_user_id])).rows[0]
        else {
          user = (await db.query(`INSERT INTO users(username,display_name) VALUES($1,$2) RETURNING *`,[`${provider}_${crypto.randomBytes(7).toString('hex')}`,String(identity.name || provider).slice(0,40)])).rows[0]
          await db.query(`INSERT INTO contribution_events(user_id,type,points,reason) VALUES($1,'ACCOUNT_CREATED',5,'Account created')`,[user.id])
          await syncAutomaticBadges(user.id,db)
        }
        await db.query('INSERT INTO auth_identities(provider,subject,user_id) VALUES($1,$2,$3)',[provider,identity.subject,user.id])
        if(record.link_user_id) await methods.revokeOtherSessions(db,req,user.id)
        return user
      })
      if(record.purpose === 'reauth') methods.grant(req,reply,user.id)
      if (!record.link_user_id) await createSession(user.id,reply,req)
      return reply.redirect(record.redirect_path)
    } catch { return failure(reply,400,'第三方授权失败，或该身份已绑定其他账号。请重新尝试。') }
  })
  // Browser-mediated authorization for desktop/mobile: the verifier never leaves the app except at exchange.
  app.post('/api/auth/app/requests',limit(10),async (req,reply) => {
    const challenge = req.body?.challenge
    if (typeof challenge !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) return failure(reply,400,'Invalid challenge.')
    const id = crypto.randomUUID()
    await pool.query(`INSERT INTO auth_app_requests(id,challenge,expires_at) VALUES($1,$2,NOW()+INTERVAL '10 minutes')`,[id,challenge])
    return { id, expiresIn:600, authorizeUrl:`${origin}/auth/approve?request=${id}` }
  })
  app.get('/api/auth/app/requests/:id',limit(60,'1 minute'),async (req,reply) => {
    if (!/^[\da-f-]{36}$/i.test(req.params.id)) return failure(reply,400,'Invalid request.')
    const result = await pool.query('SELECT id FROM auth_app_requests WHERE id=$1 AND expires_at>NOW()',[req.params.id])
    return result.rows.length ? { appName:'星账 AstrAcct' } : failure(reply,410,'登录请求已过期，请返回软件重试。')
  })
  app.post('/api/auth/app/approve',limit(10),async (req,reply) => {
    const user = await requireUser(req,reply); if (!user) return
    if (!/^[\da-f-]{36}$/i.test(req.body?.id || '')) return failure(reply,400,'Invalid request.')
    const r = await pool.query('UPDATE auth_app_requests SET user_id=$2,approved_at=NOW() WHERE id=$1 AND expires_at>NOW() AND approved_at IS NULL RETURNING id',[req.body.id,user.id])
    return r.rows.length ? { ok:true } : failure(reply,410,'登录请求已过期或已确认。')
  })
  app.post('/api/auth/app/exchange',limit(30,'1 minute'),async (req,reply) => {
    const { id, verifier } = req.body || {}
    if (!/^[\da-f-]{36}$/i.test(id || '') || typeof verifier !== 'string' || !/^[A-Za-z0-9_-]{43,128}$/.test(verifier)) return failure(reply,400,'Invalid request.')
    const { rows } = await pool.query('DELETE FROM auth_app_requests WHERE id=$1 AND challenge=$2 AND user_id IS NOT NULL AND expires_at>NOW() RETURNING user_id',[id,pkce(verifier)])
    if (!rows[0]) {
      const r = await pool.query('SELECT id FROM auth_app_requests WHERE id=$1 AND challenge=$2 AND expires_at>NOW()',[id,pkce(verifier)])
      return r.rows.length ? reply.code(202).send({ pending:true }) : failure(reply,410,'登录请求无效或已过期。')
    }
    const user = (await pool.query('SELECT * FROM users WHERE id=$1',[rows[0].user_id])).rows[0]
    const browser = req.body?.browser === true
    const token = await createSession(user.id,reply,req,!browser)
    return { user:await publicUser(user),...(browser ? {} : {token}) }
  })
}
