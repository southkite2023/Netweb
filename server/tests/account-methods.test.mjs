import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import crypto from 'node:crypto'
import { registerUnifiedAuth } from '../src/unified-auth.js'
import { accountConfig,digest } from '../src/auth-providers.js'

test('verified contacts, OAuth and passwords share one account; management is session-bound and cannot lock users out',async t=>{
 const original={...process.env}
 Object.assign(process.env,{ALIYUN_PNVS_ENABLED:'true',ALIYUN_PNVS_SIGN_NAME:'test',ALIYUN_PNVS_TEMPLATE_CODE:'100001',ALIBABA_CLOUD_CREDENTIALS_TYPE:'ecs_ram_role',ALIYUN_MAIL_ENABLED:'true',ALIYUN_MAIL_FROM:'verify@example.test',OAUTH_GITHUB_CLIENT_ID:'test',OAUTH_GITHUB_CLIENT_SECRET:'test'})
 delete process.env.ALIYUN_CAPTCHA_ENABLED
 t.after(()=>{for(const k of Object.keys(process.env))if(!(k in original))delete process.env[k];Object.assign(process.env,original)})
 assert.equal(accountConfig().sms,true)
 const db=new PGlite()
 for(const file of ['001_account_system.sql','007_unified_accounts.sql','008_email_verification.sql','009_account_methods.sql','009_account_methods.sql'])await db.exec(await readFile(new URL(`../sql/${file}`,import.meta.url),'utf8'))
 const query=async(sql,args)=>sql.startsWith('SELECT pg_advisory_xact_lock')?{rows:[]}:db.query(sql,args)
 const pool={query,connect:async()=>({query,release(){}})}
 const app=Fastify();await app.register(cookie)
 const currentUser=async req=>(await query('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=$1 AND expires_at>NOW()',[digest(req.cookies.session || '')])).rows[0]
 const createSession=async(id,reply)=>{const token=crypto.randomBytes(32).toString('base64url');await query(`INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL '30 days')`,[id,digest(token)]);reply.setCookie('session',token);return token}
 const sent=[],mail=[];let smsFails=false;let subject='github-one'
 const options={origin:'https://yuashie.cn',cookieName:'session',secret:'test-secret-that-is-at-least-32-characters',currentUser,createSession,publicUser:async u=>({id:u.id,username:u.username}),syncAutomaticBadges:async()=>{},requireUser:async(req,reply)=>{const u=await currentUser(req);if(!u)reply.code(401).send({message:'Sign in'});return u}}
 registerUnifiedAuth(app,pool,options,{verifyCaptcha:async token=>token==='captcha-proof',sendVerificationSms:async(phone,id,scheme)=>{if(smsFails)throw new Error('test delivery failure');const code=crypto.randomInt(0,1000000).toString().padStart(6,'0');sent.push({phone,code,id,scheme});return {code}},checkVerificationSms:async(phone,code,id)=>sent.some(s=>s.id===id && s.phone===phone && s.code===code),sendVerificationEmail:async(email,code,purpose)=>mail.push({email,code,purpose}),oauthIdentity:async()=>({subject,name:'GitHub'})})
 t.after(async()=>{await app.close();await db.close()})
 const post=(url,payload={},session='')=>app.inject({method:'POST',url,payload,headers:{cookie:session}})
 const get=(url,session='')=>app.inject({url,headers:{cookie:session}})
 const del=(method,session)=>app.inject({method:'DELETE',url:`/api/auth/methods/${method}`,headers:{cookie:session}})
 const c=r=>{const values=[r.headers['set-cookie']].flat();return (values.find(v=>v.startsWith('session=')) || values[0]).split(';')[0]}
 const phone='13800138000'
 const sentCode=async(phone,purpose,session='')=>{const r=await post('/api/auth/phone/send',{phone,purpose},session);assert.equal(r.statusCode,200,r.body);return {challengeId:r.json().challengeId,code:sent.at(-1).code}}
 assert.equal((await get('/api/auth/methods')).statusCode,401)
 const proof=await sentCode(phone,'register')
 assert.equal((await post('/api/auth/phone/send',{phone,purpose:'register'})).statusCode,429)
 const body={username:'phone_user',displayName:'Phone',phone,password:'ExamplePass123',...proof}
 assert.equal((await post('/api/auth/register',{...body,phone:'13900139000'})).statusCode,400)
 assert.equal((await post('/api/auth/phone/login',{phone,...proof})).statusCode,400)
 const registered=await post('/api/auth/register',body);assert.equal(registered.statusCode,201,registered.body)
 const id=registered.json().user.id,session=c(registered)
 assert.equal((await post('/api/auth/register',{...body,username:'replay'})).statusCode,400)
 const login=await post('/api/auth/login',{identifier:'+8613800138000',password:'ExamplePass123'});assert.equal(login.json().user.id,id)
 await query(`UPDATE auth_phone_challenges SET created_at=NOW()-INTERVAL '61 seconds' WHERE phone=$1`,['+86'+phone])
 const loginProof=await sentCode(phone,'login')
 const sms=await post('/api/auth/phone/login',{phone,...loginProof});assert.equal(sms.json().user.id,id)
 assert.equal((await post('/api/auth/phone/login',{phone,...loginProof})).statusCode,400)
 assert.equal((await post('/api/auth/oauth/github/link',{},session)).statusCode,403)
 assert.equal((await post('/api/auth/methods/password',{password:'NewPassword123'},session)).statusCode,403)
 assert.equal((await post('/api/auth/reauth',{password:'wrong'},session)).statusCode,400)
 const reauth=await post('/api/auth/reauth',{password:'ExamplePass123'},session);assert.equal(reauth.statusCode,200,reauth.body)
 const managed=`${session}; ${c(reauth)}`
 assert.equal((await get('/api/auth/methods',managed)).json().fresh,true)
 assert.equal((await get('/api/auth/methods',`${c(login)}; ${c(reauth)}`)).json().fresh,false)
 assert.equal((await del('phone',managed)).statusCode,409)
 // A target-address proof is not sufficient without verifying the original account first.
 const emailProof=await post('/api/auth/email/send',{email:'one@example.test',purpose:'bind'},managed)
 assert.equal(emailProof.statusCode,200,emailProof.body)
 const emailPayload={email:'one@example.test',challengeId:emailProof.json().challengeId,code:mail.at(-1).code}
 assert.equal((await post('/api/auth/methods/email',emailPayload,session)).statusCode,403)
 const boundEmail=await post('/api/auth/methods/email',emailPayload,managed);assert.equal(boundEmail.statusCode,200,boundEmail.body)
 assert.equal((await get('/api/auth/methods',c(sms))).statusCode,401) // other sessions revoked
 assert.equal((await post('/api/auth/login',{identifier:'one@example.test',password:'ExamplePass123'})).json().user.id,id)
 assert.equal((await get('/api/auth/methods',managed)).json().userId,String(id))
 const start=await post('/api/auth/oauth/github/link',{redirect:'/auth/security'},managed);assert.equal(start.statusCode,200,start.body)
 const state=new URL(start.json().url).searchParams.get('state')
 const cb=await get(`/api/auth/oauth/github/callback?state=${state}&code=code`,`${managed}; ${c(start)}`);assert.equal(cb.statusCode,302,cb.body)
 assert.equal((await query('SELECT user_id FROM auth_identities WHERE subject=$1',[subject])).rows[0].user_id,id)
 const thirdStart=await get('/api/auth/oauth/github/start'),thirdState=new URL(thirdStart.headers.location).searchParams.get('state')
 const third=await get(`/api/auth/oauth/github/callback?state=${thirdState}&code=code`,c(thirdStart));assert.equal(third.statusCode,302,third.body)
 assert.equal((await get('/api/auth/methods',c(third))).json().userId,String(id))
 // Other accounts cannot claim a contact or provider which is already owned.
 const secondProof=await sentCode('13900139000','register')
 const second=await post('/api/auth/register',{username:'second',displayName:'Second',phone:'13900139000',password:'ExamplePass123',...secondProof})
 const secondSession=c(second),secondReauth=await post('/api/auth/reauth',{password:'ExamplePass123'},secondSession),secondManaged=`${secondSession}; ${c(secondReauth)}`
 await query(`UPDATE auth_email_challenges SET created_at=NOW()-INTERVAL '61 seconds' WHERE email='one@example.test'`)
 const conflict=await post('/api/auth/email/send',{email:'one@example.test',purpose:'bind'},secondManaged)
 const collision=await post('/api/auth/methods/email',{email:'one@example.test',challengeId:conflict.json().challengeId,code:mail.at(-1).code},secondManaged)
 assert.equal(collision.statusCode,409,collision.body)
 const conflictStart=await post('/api/auth/oauth/github/link',{},secondManaged)
 const conflictState=new URL(conflictStart.json().url).searchParams.get('state')
 assert.equal((await get(`/api/auth/oauth/github/callback?state=${conflictState}&code=code`,`${secondManaged}; ${c(conflictStart)}`)).statusCode,400)
 assert.equal((await query('SELECT user_id FROM auth_identities WHERE subject=$1',[subject])).rows[0].user_id,id)
 // OTP attempts and expiry are enforced and remain consumed after failed verification.
 const wrong=await sentCode('13700137000','login')
 const wrongCode=wrong.code==='000000'?'111111':'000000'
 for(let i=0;i<5;i++)assert.equal((await post('/api/auth/phone/login',{phone:'13700137000',...wrong,code:wrongCode})).statusCode,400)
 assert.equal((await post('/api/auth/phone/login',{phone:'13700137000',...wrong})).statusCode,400)
 const expired=await sentCode('13600136000','login')
 await query(`UPDATE auth_phone_challenges SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1`,[expired.challengeId])
 assert.equal((await post('/api/auth/phone/login',{phone:'13600136000',...expired})).statusCode,400)
 // Current account stays usable while an identifier is removed and later rebound.
 assert.equal((await del('phone',managed)).statusCode,200)
 assert.equal((await post('/api/auth/login',{identifier:phone,password:'ExamplePass123'})).statusCode,401)
 const rebound=await sentCode('13500135000','bind',managed)
 assert.equal((await post('/api/auth/methods/phone',{phone:'13500135000',...rebound},secondManaged)).statusCode,400)
 assert.equal((await post('/api/auth/methods/phone',{phone:'13500135000',...rebound},managed)).statusCode,200)
 assert.equal((await post('/api/auth/login',{identifier:'13500135000',password:'ExamplePass123'})).json().user.id,id)
 assert.equal((await del('password',managed)).statusCode,200)
 assert.equal((await del('phone',managed)).statusCode,200) // GitHub remains
 assert.equal((await del('github',managed)).statusCode,409) // email alone is not a login
 // OAuth-only accounts can reauthenticate with their already-owned provider.
 const reauthStart=await post('/api/auth/oauth/github/link',{reauth:true,redirect:'/auth/security'},session)
 const reauthState=new URL(reauthStart.json().url).searchParams.get('state')
 const reauthCb=await get(`/api/auth/oauth/github/callback?state=${reauthState}&code=code`,`${session}; ${c(reauthStart)}`)
 assert.equal(reauthCb.statusCode,302,reauthCb.body)
 assert.match(reauthCb.headers['set-cookie'].join(';'),/yuashie_manage=/)
 await query(`UPDATE auth_email_challenges SET created_at=NOW()-INTERVAL '61 seconds' WHERE email='one@example.test'`)
 const emailManage=await post('/api/auth/email/send',{email:'one@example.test',purpose:'manage'},session)
 assert.equal(emailManage.statusCode,200,emailManage.body)
 const emailReauth=await post('/api/auth/reauth',{channel:'email',challengeId:emailManage.json().challengeId,code:mail.at(-1).code},session)
 assert.equal(emailReauth.statusCode,200,emailReauth.body)
 assert.equal((await post('/api/auth/reauth',{channel:'email',challengeId:emailManage.json().challengeId,code:mail.at(-1).code},session)).statusCode,400)
 await query(`UPDATE auth_phone_challenges SET created_at=NOW()-INTERVAL '61 seconds' WHERE phone='+8613900139000'`)
 const phoneManage=await sentCode('13900139000','manage',secondSession)
 assert.equal((await post('/api/auth/reauth',{channel:'phone',...phoneManage},secondSession)).statusCode,200)
 smsFails=true
 const failedSend=await post('/api/auth/phone/send',{phone:'13300133000',purpose:'login'})
 assert.equal(failedSend.statusCode,503)
 assert.equal((await query("SELECT sent FROM auth_phone_challenges WHERE phone='+8613300133000'")).rows[0].sent,false)
 process.env.ALIYUN_CAPTCHA_ENABLED='true'
 assert.equal((await post('/api/auth/phone/send',{phone:'13400134000',purpose:'login'})).statusCode,400)
 process.env.ALIYUN_PNVS_ENABLED='false'
 assert.equal((await post('/api/auth/phone/send',{phone,purpose:'login'})).statusCode,503)
})
