import crypto from 'node:crypto'
import argon2 from 'argon2'
import { accountConfig, normalizePhone, digest } from './auth-providers.js'
import { normalizeEmail, consumeEmailCode } from './email-verification.js'
import { consumePhoneCode, phoneCodeHash, sendVerificationSms, checkVerificationSms } from './phone-verification.js'
import { safeEqual } from './cloud-sync.js'

export function registerAccountMethods(app,pool,options,helpers,services={}) {
  const {secret,cookieName,requireUser,publicUser,createSession,syncAutomaticBadges}=options
  const {transaction,captcha}=helpers
  const checkSms=services.checkVerificationSms || checkVerificationSms
  const consumeSms=(db,key,payload,userId=null)=>consumePhoneCode(db,key,payload,userId,checkSms)
  const sendSms=services.sendVerificationSms || sendVerificationSms
  const failure=(reply,status,message)=>reply.code(status).send({message})
  const limit=max=>({config:{rateLimit:{max,timeWindow:'15 minutes'}}})
  const session=req=>/^Bearer [A-Za-z0-9_-]{43}$/.test(req.headers.authorization || '') ? req.headers.authorization.slice(7) : req.cookies[cookieName]
  const mac=value=>crypto.createHmac('sha256',secret).update(`manage:${value}`).digest('base64url')
  function grant(req,reply,userId) {
    const value=Buffer.from(JSON.stringify({user:String(userId),session:digest(session(req)),until:Date.now()+600000})).toString('base64url')
    reply.setCookie('yuashie_manage',`${value}.${mac(value)}`,{path:'/api/auth',httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',maxAge:600})
  }
  function fresh(req,userId) {
    try {
      const [value,signature]=String(req.cookies.yuashie_manage || '').split('.')
      if(!value || !signature || !safeEqual(signature,mac(value))) return false
      const proof=JSON.parse(Buffer.from(value,'base64url').toString())
      return proof.user===String(userId) && proof.session===digest(session(req)) && proof.until>Date.now()
    } catch {return false}
  }
  async function requireFresh(req,reply) {
    const user=await requireUser(req,reply);if(!user)return null
    if(!fresh(req,user.id)){failure(reply,403,'请先验证当前账号身份，再管理登录方式。');return null}
    return user
  }
  // Lock the owning account for every add/remove, including OAuth callbacks.
  async function revokeOtherSessions(db,req,userId) {
    await db.query('DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2',[userId,digest(session(req))])
    await db.query('DELETE FROM auth_app_requests WHERE user_id=$1',[userId])
    await db.query('DELETE FROM auth_oauth_states WHERE link_user_id=$1',[userId])
  }
  app.get('/api/auth/methods',async(req,reply)=>{
    const user=await requireUser(req,reply);if(!user)return
    const {rows}=await pool.query('SELECT provider,created_at FROM auth_identities WHERE user_id=$1 ORDER BY provider',[user.id])
    return {userId:String(user.id),email:user.email,emailVerified:!!user.email_verified_at,phone:user.phone,phoneVerified:!!user.phone_verified_at,password:!!user.password_hash,providers:rows.map(r=>r.provider),fresh:fresh(req,user.id)}
  })
  app.post('/api/auth/reauth',limit(5),async(req,reply)=>{
    const user=await requireUser(req,reply);if(!user)return
    let valid=false
    if(typeof req.body?.password==='string' && req.body.password.length<=128 && user.password_hash) valid=await argon2.verify(user.password_hash,req.body.password)
    else if(req.body?.channel==='email' && user.email_verified_at) valid=await transaction(db=>consumeEmailCode(db,secret,{...req.body,email:user.email,purpose:'manage'},user.id))
    else if(req.body?.channel==='phone' && user.phone_verified_at) valid=await transaction(db=>consumeSms(db,secret,{...req.body,phone:user.phone,purpose:'manage'},user.id))
    if(!valid)return failure(reply,400,'身份验证失败，请检查密码或验证码。')
    grant(req,reply,user.id);return {ok:true,expiresIn:600}
  })
  app.post('/api/auth/phone/send',limit(5),async(req,reply)=>{
    if(!accountConfig().sms)return failure(reply,503,'短信验证尚未开通。')
    const phone=normalizePhone(req.body?.phone),purpose=req.body?.purpose
    if(!phone || !['register','login','bind','manage'].includes(purpose))return failure(reply,400,'请输入有效的中国大陆手机号及验证用途。')
    let user=null
    if(['bind','manage'].includes(purpose)) {
      user=purpose==='bind'?await requireFresh(req,reply):await requireUser(req,reply);if(!user)return
      if(purpose==='manage' && (user.phone!==phone || !user.phone_verified_at))return failure(reply,400,'请使用当前账号已验证的手机号。')
    }
    if(accountConfig().captchaRequired && !await captcha(req.body?.captchaVerifyParam))return failure(reply,400,'请先完成安全验证。')
    const id=crypto.randomUUID(),scheme=process.env.ALIYUN_PNVS_SCHEME_NAME || ''
    const ipHash=crypto.createHmac('sha256',secret).update(req.ip).digest('hex')
    const reserved=await transaction(async db=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`sms-ip:${ipHash}`])
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`sms-phone:${phone}`])
      const {rows}=await db.query(`SELECT COUNT(*) FILTER(WHERE phone=$1 AND created_at>NOW()-INTERVAL '60 seconds') AS recent,COUNT(*) FILTER(WHERE phone=$1) AS daily,COUNT(*) FILTER(WHERE ip_hash=$2) AS ip_daily FROM auth_phone_challenges WHERE created_at>NOW()-INTERVAL '1 day' AND (phone=$1 OR ip_hash=$2)`,[phone,ipHash])
      if(+rows[0].recent || +rows[0].daily>=10 || +rows[0].ip_daily>=30)return false
      await db.query(`INSERT INTO auth_phone_challenges(id,phone,purpose,user_id,code_hash,ip_hash,scheme_name,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,NOW()+INTERVAL '5 minutes')`,[id,phone,purpose,user?.id || null,crypto.randomBytes(32).toString('hex'),ipHash,scheme]);return true
    })
    if(!reserved)return failure(reply,429,'短信发送过于频繁，请稍后重试。')
    try {
      const delivery=await sendSms(phone,id,scheme)
      if(!/^\d{6}$/.test(delivery?.code || ''))throw new Error('Invalid SMS response')
      await transaction(async db=>{
        await db.query('UPDATE auth_phone_challenges SET sent=TRUE,code_hash=$2 WHERE id=$1',[id,phoneCodeHash(secret,id,phone,purpose,delivery.code)])
        await db.query('UPDATE auth_phone_challenges SET used_at=NOW() WHERE phone=$1 AND purpose=$2 AND id<>$3 AND used_at IS NULL',[phone,purpose,id])
      })
      return {challengeId:id,retryAfter:60,expiresIn:300,message:'短信验证码已发送，5 分钟内有效。'}
    }catch{return failure(reply,503,'短信发送失败，请稍后重试。')}
  })
  app.post('/api/auth/phone/login',limit(8),async(req,reply)=>{
    if(!accountConfig().sms)return failure(reply,503,'短信验证尚未开通。')
    const phone=normalizePhone(req.body?.phone)
    const result=await transaction(async db=>{
      if(!phone || !await consumeSms(db,secret,{...req.body,phone,purpose:'login'}))return {invalid:true}
      return {user:(await db.query('SELECT * FROM users WHERE phone=$1 AND phone_verified_at IS NOT NULL',[phone])).rows[0]}
    })
    if(result.invalid)return failure(reply,400,'验证码无效、已使用或已过期。')
    if(!result.user)return failure(reply,400,'该手机号未绑定账号，请先注册或在原账号中绑定。')
    await createSession(result.user.id,reply,req);return {user:await publicUser(result.user)}
  })
  async function registerPhone(req,reply) {
    if(!accountConfig().sms)return failure(reply,503,'手机号注册需接入短信验证后才能开放。')
    const {username,displayName,password}=req.body || {},phone=normalizePhone(req.body?.phone)
    if(!phone || !/^[A-Za-z0-9_-]{3,24}$/.test(username || '') || typeof displayName!=='string' || !displayName.trim() || displayName.trim().length>40 || typeof password!=='string' || password.length<8 || password.length>128)return failure(reply,400,'请检查手机号、用户名、昵称及 8～128 位密码。')
    const hash=await argon2.hash(password,{type:argon2.argon2id})
    try {
      const user=await transaction(async db=>{
        if(!await consumeSms(db,secret,{...req.body,phone,purpose:'register'}))return null
        const {rows}=await db.query(`INSERT INTO users(username,display_name,password_hash,phone,phone_verified_at) VALUES($1,$2,$3,$4,NOW()) RETURNING *`,[username,displayName.trim(),hash,phone])
        await db.query(`INSERT INTO contribution_events(user_id,type,points,reason) VALUES($1,'ACCOUNT_CREATED',5,'Account created')`,[rows[0].id]);await syncAutomaticBadges(rows[0].id,db);return rows[0]
      })
      if(!user)return failure(reply,400,'验证码无效、已使用或已过期。')
      await createSession(user.id,reply,req);return reply.code(201).send({user:await publicUser(user)})
    }catch(e){if(e.code==='23505')return failure(reply,409,'用户名或手机号已被使用，请登录原账号。');throw e}
  }
  for(const channel of ['email','phone']) {
    app.post(`/api/auth/methods/${channel}`,limit(5),async(req,reply)=>{
      const user=await requireFresh(req,reply);if(!user)return
      if(!(channel==='phone'?accountConfig().sms:accountConfig().emailVerification))return failure(reply,503,'验证服务尚未开通。')
      const value=channel==='phone'?normalizePhone(req.body?.phone):normalizeEmail(req.body?.email)
      if(!value)return failure(reply,400,'联系方式格式有误。')
      try {
        const result=await transaction(async db=>{
          const locked=(await db.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[user.id])).rows[0]
          // Replacing an existing contact requires explicitly unbinding it first.
          if(locked[channel] && locked[channel]!==value)return 'bound'
          const valid=await (channel==='phone'?consumeSms:consumeEmailCode)(db,secret,{...req.body,[channel]:value,purpose:'bind'},user.id)
          if(!valid)return 'invalid'
          await db.query(`UPDATE users SET ${channel}=$2,${channel}_verified_at=NOW(),updated_at=NOW() WHERE id=$1`,[user.id,value])
          await revokeOtherSessions(db,req,user.id);return 'ok'
        })
        if(result!=='ok')return failure(reply,400,result==='bound'?'请先解绑原联系方式，再绑定新的联系方式。':'验证码无效、已使用或已过期。')
        return {ok:true}
      }catch(e){if(e.code==='23505')return failure(reply,409,'该联系方式已属于其他账号，不能直接合并或覆盖。');throw e}
    })
  }
  app.post('/api/auth/methods/password',limit(5),async(req,reply)=>{
    const user=await requireFresh(req,reply);if(!user)return
    const password=req.body?.password
    if(typeof password!=='string' || password.length<8 || password.length>128)return failure(reply,400,'密码长度应为 8～128 位。')
    const hash=await argon2.hash(password,{type:argon2.argon2id})
    const changed=await transaction(async db=>{
      const locked=(await db.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[user.id])).rows[0]
      if(!locked.email && !locked.phone)return false
      await db.query('UPDATE users SET password_hash=$2,updated_at=NOW() WHERE id=$1',[user.id,hash]);await revokeOtherSessions(db,req,user.id);return true
    });return changed?{ok:true}:failure(reply,400,'请先绑定邮箱或手机号。')
  })
  app.delete('/api/auth/methods/:method',limit(5),async(req,reply)=>{
    const user=await requireFresh(req,reply);if(!user)return
    const method=req.params.method
    if(!['email','phone','password','qq','github','google'].includes(method))return failure(reply,400,'不支持的登录方式。')
    const result=await transaction(async db=>{
      const locked=(await db.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[user.id])).rows[0]
      const ids=(await db.query('SELECT provider FROM auth_identities WHERE user_id=$1',[user.id])).rows.map(r=>r.provider).filter(p=>p!==method)
      const email=method!=='email' && !!locked.email,phone=method!=='phone' && !!locked.phone_verified_at,password=method!=='password' && !!locked.password_hash
      const usable=ids.some(id=>accountConfig().providers.some(p=>p.id===id && p.enabled)) || (password && (email || phone)) || (phone && accountConfig().sms)
      if(!usable)return false
      if(method==='email' || method==='phone')await db.query(`UPDATE users SET ${method}=NULL,${method}_verified_at=NULL,updated_at=NOW() WHERE id=$1`,[user.id])
      else if(method==='password')await db.query('UPDATE users SET password_hash=NULL,updated_at=NOW() WHERE id=$1',[user.id])
      else await db.query('DELETE FROM auth_identities WHERE user_id=$1 AND provider=$2',[user.id,method])
      await revokeOtherSessions(db,req,user.id);return true
    })
    return result?{ok:true}:failure(reply,409,'请先添加另一种可用的登录方式，不能解绑最后一种登录方式。')
  })
  return {grant,requireFresh,registerPhone,revokeOtherSessions}
}
