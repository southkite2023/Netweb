import crypto from 'node:crypto'
import argon2 from 'argon2'
import { accountConfig, digest, pkce, normalizePhone, localRedirect, verifyCaptcha, authorizationUrl, oauthIdentity } from './auth-providers.js'
import { safeEqual } from './cloud-sync.js'

export function registerUnifiedAuth(app, pool, { origin, cookieName, secret, currentUser, requireUser, publicUser, createSession, syncAutomaticBadges }, services = {}) {
  const providers = { verifyCaptcha, oauthIdentity, ...services }
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
  app.get('/api/auth/config', async () => accountConfig())
  app.post('/api/auth/register', limit(5), async (req, reply) => {
    const { username, displayName, password, email } = req.body || {}
    if (req.body?.phone) return failure(reply,503,'手机号注册需接入短信验证后才能开放。')
    if (!/^[A-Za-z0-9_-]{3,24}$/.test(username || '') || typeof displayName !== 'string' || !displayName.trim() || displayName.trim().length > 40) return failure(reply,400,'请检查用户名和昵称。')
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) return failure(reply,400,'密码长度应为 8～128 位。')
    if ((typeof email !== 'string' || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email))) return failure(reply,400,'邮箱格式有误。')
    if (accountConfig().captchaRequired && !await captcha(req.body?.captchaVerifyParam)) return failure(reply,400,'请先完成安全验证。')
    const passwordHash = await argon2.hash(password,{ type:argon2.argon2id })
    try {
      const user = await transaction(async db => {
        const { rows } = await db.query(`INSERT INTO users(username,email,password_hash,display_name) VALUES($1,$2,$3,$4) RETURNING *`,[username,email.trim().toLowerCase(),passwordHash,displayName.trim()])
        await db.query(`INSERT INTO contribution_events(user_id,type,points,reason) VALUES($1,'ACCOUNT_CREATED',5,'Account created')`,[rows[0].id])
        await syncAutomaticBadges(rows[0].id,db)
        return rows[0]
      })
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
  app.post('/api/auth/password/reset',limit(5),async (req,reply) => failure(reply,503,'密码找回将在邮箱或短信验证服务接入后开放。'))
  function enabled(provider) { return accountConfig().providers.some(p => p.id === provider && p.enabled) }
  async function startOAuth(req,reply,linkUser = null) {
    const provider = req.params.provider
    if (!enabled(provider)) return failure(reply,503,'该第三方登录尚未配置。')
    const state = crypto.randomBytes(32).toString('base64url'), verifier = crypto.randomBytes(32).toString('base64url'), nonce = crypto.randomBytes(32).toString('base64url')
    await pool.query(`INSERT INTO auth_oauth_states(state_hash,provider,verifier,nonce,redirect_path,link_user_id,expires_at) VALUES($1,$2,$3,$4,$5,$6,NOW()+INTERVAL '10 minutes')`,[digest(state),provider,verifier,nonce,localRedirect(req.query.redirect || req.body?.redirect),linkUser])
    reply.setCookie('yuashie_oauth',state,{ path:'/api/auth/oauth',httpOnly:true,secure:process.env.NODE_ENV === 'production',sameSite:'lax',maxAge:600 })
    const url = authorizationUrl(provider,origin,state,verifier,nonce)
    return linkUser ? { url } : reply.redirect(url)
  }
  app.get('/api/auth/oauth/:provider/start',limit(10),startOAuth)
  app.post('/api/auth/oauth/:provider/link',limit(5),async (req,reply) => {
    const user = await requireUser(req,reply); if (!user) return
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
        const existing = await db.query('SELECT u.* FROM auth_identities i JOIN users u ON u.id=i.user_id WHERE provider=$1 AND subject=$2',[provider,identity.subject])
        if (existing.rows[0]) {
          if (record.link_user_id && String(existing.rows[0].id) !== String(record.link_user_id)) throw new Error('Identity already linked')
          return existing.rows[0]
        }
        let user
        if (record.link_user_id) user = (await db.query('SELECT * FROM users WHERE id=$1',[record.link_user_id])).rows[0]
        else {
          user = (await db.query(`INSERT INTO users(username,display_name) VALUES($1,$2) RETURNING *`,[`${provider}_${crypto.randomBytes(7).toString('hex')}`,String(identity.name || provider).slice(0,40)])).rows[0]
          await db.query(`INSERT INTO contribution_events(user_id,type,points,reason) VALUES($1,'ACCOUNT_CREATED',5,'Account created')`,[user.id])
          await syncAutomaticBadges(user.id,db)
        }
        await db.query('INSERT INTO auth_identities(provider,subject,user_id) VALUES($1,$2,$3)',[provider,identity.subject,user.id])
        return user
      })
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
