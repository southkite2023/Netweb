import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import crypto from 'node:crypto'
import { registerUnifiedAuth } from '../src/unified-auth.js'
import { accountConfig, normalizePhone, localRedirect, digest, pkce, authorizationUrl } from '../src/auth-providers.js'

test('configuration keeps unconfigured services disabled and validates identifiers and redirects', () => {
 assert.equal(accountConfig({}).sms,false)
 assert.equal(accountConfig({}).providers.some(p=>p.enabled),false)
 assert.equal(accountConfig({ALIYUN_CAPTCHA_ENABLED:'true'}).captchaRequired,true)
 assert.equal(accountConfig({ALIYUN_CAPTCHA_SCENE_ID:'scene',ALIYUN_CAPTCHA_PREFIX:'prefix'}).captchaConfigured,false)
 assert.equal(normalizePhone('13800138000'),'+8613800138000')
 assert.equal(normalizePhone('+8613800138000'),'+8613800138000')
 assert.equal(normalizePhone('abc'),null)
 for (const path of ['//evil.test','/\\evil.test','https://evil.test','/\n/evil.test']) assert.equal(localRedirect(path),'/')
 assert.equal(localRedirect('/auth/approve?request=123'),'/auth/approve?request=123')
})

test('shared accounts, password hashes, proof-bound app handoff, OAuth linking and captcha enforcement', async t => {
 const db = new PGlite()
 for (const file of ['001_account_system.sql','006_cloud_sync.sql','007_unified_accounts.sql','008_email_verification.sql','009_account_methods.sql']) await db.exec(await readFile(new URL(`../sql/${file}`,import.meta.url),'utf8'))
 await db.exec(await readFile(new URL('../sql/007_unified_accounts.sql',import.meta.url),'utf8'))
 // PGlite is single-connection; PostgreSQL advisory locking is tested by the SQL call but unnecessary in this serialized harness.
 const query = async(sql,args) => sql.startsWith('SELECT pg_advisory_xact_lock') ? {rows:[]} : db.query(sql,args)
 const pool = {query, connect:async()=>({query,release(){}})}
 const app = Fastify(); await app.register(cookie)
 const currentUser = async req => {
   const token = req.headers.authorization?.slice(7) || req.cookies.session
   if (!token) return null
   return (await query('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=$1 AND expires_at>NOW()',[digest(token)])).rows[0]
 }
 const publicUser = async u => ({id:u.id,username:u.username,displayName:u.display_name})
 const createSession = async(id,reply,req,native=false) => {
   const token=crypto.randomBytes(32).toString('base64url')
   await query(`INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL '30 days')`,[id,digest(token)])
   if(!native) reply.setCookie('session',token)
   return token
 }
 const options={origin:'https://yuashie.cn',cookieName:'session',secret:'test-only-very-long-secret-123456789',currentUser,publicUser,createSession,syncAutomaticBadges:async()=>{},requireUser:async(req,reply)=>{const u=await currentUser(req);if(!u)reply.code(401).send({message:'Sign in'});return u}}
 let captchaValid = false, identitySubject='provider-subject'
 const sentMail=[]
 registerUnifiedAuth(app,pool,options,{verifyCaptcha:async(param)=>captchaValid && param === 'test-proof',oauthIdentity:async()=>({subject:identitySubject,name:'External user'}),sendVerificationEmail:async(email,code,purpose)=>{sentMail.push({email,code,purpose})}})
 t.after(async()=>{await app.close();await db.close()})
 const post = (url,payload,headers={})=>app.inject({method:'POST',url,payload,headers})
 const reg = await post('/api/auth/register',{username:'shared_user',displayName:'Shared',email:'shared@example.test',password:'ExamplePass123'})
 assert.equal(reg.statusCode,201,reg.body)
 const id=reg.json().user.id, cookieHeader=reg.headers['set-cookie'].split(';')[0]
 const stored=(await query('SELECT * FROM users WHERE id=$1',[id])).rows[0]
 assert.match(stored.password_hash,/^\$argon2id\$/)
 assert.equal(stored.email_verified_at,null)
 const native=await post('/api/auth/native/login',{identifier:'shared@example.test',password:'ExamplePass123'})
 assert.equal(native.statusCode,200,native.body);assert.equal(native.json().user.id,id);assert.equal(native.headers['set-cookie'],undefined)
 assert.equal((await query('SELECT user_id FROM sessions WHERE token_hash=$1',[digest(native.json().token)])).rows[0].user_id,id)
 assert.equal((await post('/api/auth/login',{identifier:'shared@example.test',password:'wrong'})).statusCode,401)
 assert.equal((await post('/api/auth/register',{username:'phone_user',displayName:'Phone',phone:'13800138000',password:'ExamplePass123'})).statusCode,503)
 assert.equal((await post('/api/auth/password/reset',{})).statusCode,503)
 const verifier=crypto.randomBytes(32).toString('base64url')
 const handoff=await post('/api/auth/app/requests',{challenge:pkce(verifier)}), requestId=handoff.json().id
 assert.equal((await post('/api/auth/app/exchange',{id:requestId,verifier})).statusCode,202)
 assert.equal((await post('/api/auth/app/approve',{id:requestId})).statusCode,401)
 assert.equal((await post('/api/auth/app/approve',{id:requestId},{cookie:cookieHeader})).statusCode,200)
 assert.equal((await post('/api/auth/app/exchange',{id:requestId,verifier:'x'.repeat(43)})).statusCode,410)
 const exchanged=await post('/api/auth/app/exchange',{id:requestId,verifier});assert.equal(exchanged.statusCode,200,exchanged.body);assert.equal(exchanged.json().user.id,id)
 assert.equal((await post('/api/auth/app/exchange',{id:requestId,verifier})).statusCode,410)
 const webRequest=(await post('/api/auth/app/requests',{challenge:pkce(verifier)})).json().id
 await post('/api/auth/app/approve',{id:webRequest},{cookie:cookieHeader})
 const webExchange=await post('/api/auth/app/exchange',{id:webRequest,verifier,browser:true})
 assert.equal(webExchange.statusCode,200,webExchange.body)
 assert.equal(webExchange.json().token,undefined)
 assert.match(webExchange.headers['set-cookie'],/^session=/)
 const expired=await post('/api/auth/app/requests',{challenge:pkce(verifier)})
 await query(`UPDATE auth_app_requests SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1`,[expired.json().id])
 assert.equal((await post('/api/auth/app/approve',{id:expired.json().id},{cookie:cookieHeader})).statusCode,410)
 assert.equal((await app.inject('/api/auth/oauth/github/start')).statusCode,503)
 process.env.OAUTH_GITHUB_CLIENT_ID='test-public-id';process.env.OAUTH_GITHUB_CLIENT_SECRET='test-secret'
 t.after(()=>{delete process.env.OAUTH_GITHUB_CLIENT_ID;delete process.env.OAUTH_GITHUB_CLIENT_SECRET;delete process.env.ALIYUN_MAIL_ENABLED;delete process.env.ALIYUN_MAIL_FROM;delete process.env.ALIBABA_CLOUD_CREDENTIALS_TYPE;delete process.env.ALIYUN_CAPTCHA_ENABLED;delete process.env.ALIYUN_CAPTCHA_SCENE_ID;delete process.env.ALIYUN_CAPTCHA_PREFIX})
 const start=await app.inject('/api/auth/oauth/github/start?redirect=%2Fauth%2Fsecurity')
 assert.equal(start.statusCode,302,start.body)
 const authUrl=new URL(start.headers.location), state=authUrl.searchParams.get('state'), oauthCookie=start.headers['set-cookie'].split(';')[0]
 assert.equal(authUrl.origin,'https://github.com');assert.equal(authUrl.searchParams.get('code_challenge_method'),'S256')
 assert.equal((await app.inject({url:`/api/auth/oauth/github/callback?state=${state}&code=example`,headers:{cookie:'yuashie_oauth=invalid'}})).statusCode,400)
 const callback=await app.inject({url:`/api/auth/oauth/github/callback?state=${state}&code=example`,headers:{cookie:oauthCookie}})
 assert.equal(callback.statusCode,302,callback.body);assert.equal(callback.headers.location,'/auth/security')
 const external=(await query(`SELECT u.* FROM users u JOIN auth_identities i ON i.user_id=u.id WHERE subject=$1`,[identitySubject])).rows[0]
 assert.notEqual(external.id,id);assert.equal(external.email,null);assert.equal(external.password_hash,null)
 assert.equal((await app.inject({url:`/api/auth/oauth/github/callback?state=${state}&code=example`,headers:{cookie:oauthCookie}})).statusCode,400)
 identitySubject='linked-to-existing'
 const reauth=await post('/api/auth/reauth',{password:'ExamplePass123'},{cookie:cookieHeader})
 assert.equal(reauth.statusCode,200,reauth.body)
 const managementCookie=reauth.headers['set-cookie'].split(';')[0]
 const linking=await post('/api/auth/oauth/github/link',{redirect:'/auth/security'},{cookie:`${cookieHeader}; ${managementCookie}`})
 const linkState=new URL(linking.json().url).searchParams.get('state'), linkCookie=linking.headers['set-cookie'].split(';')[0]
 const linked=await app.inject({url:`/api/auth/oauth/github/callback?state=${linkState}&code=example`,headers:{cookie:`${cookieHeader}; ${linkCookie}`}})
 assert.equal(linked.statusCode,302,linked.body)
 assert.equal((await query('SELECT user_id FROM auth_identities WHERE subject=$1',[identitySubject])).rows[0].user_id,id)
 process.env.ALIYUN_CAPTCHA_ENABLED='true';process.env.ALIYUN_CAPTCHA_SCENE_ID='test-scene';process.env.ALIYUN_CAPTCHA_PREFIX='test-prefix'
 assert.equal((await post('/api/auth/login',{identifier:'shared@example.test',password:'ExamplePass123'})).statusCode,428)
 captchaValid=true
 assert.equal((await post('/api/auth/login',{identifier:'shared@example.test',password:'ExamplePass123',captchaVerifyParam:'test-proof'})).statusCode,200)
 assert.equal((await post('/api/auth/native/login',{identifier:'shared@example.test',password:'ExamplePass123',captchaVerifyParam:'test-proof'})).statusCode,428)
 assert.equal((await post('/api/auth/register',{username:'no_captcha',displayName:'No captcha',email:'new@example.test',password:'ExamplePass123'})).statusCode,400)
 process.env.ALIBABA_CLOUD_CREDENTIALS_TYPE='ecs_ram_role';process.env.ALIYUN_MAIL_ENABLED='true';process.env.ALIYUN_MAIL_FROM='verify@example.test'
 const sendEmail=(email,purpose)=>post('/api/auth/email/send',{email,purpose,captchaVerifyParam:'test-proof'})
 assert.equal((await post('/api/auth/email/send',{email:'new@example.test',purpose:'register'})).statusCode,400)
 const challenge=await sendEmail('new@example.test','register')
 assert.equal(challenge.statusCode,200,challenge.body)
 const proof={challengeId:challenge.json().challengeId,code:sentMail.at(-1).code}
 assert.equal((await sendEmail('new@example.test','register')).statusCode,429)
 const codeRow=(await query('SELECT * FROM auth_email_challenges WHERE id=$1',[proof.challengeId])).rows[0]
 assert.notEqual(codeRow.code_hash,proof.code);assert.match(codeRow.code_hash,/^[a-f0-9]{64}$/)
 assert.equal((await post('/api/auth/register',{username:'email_new',displayName:'New',email:'new@example.test',password:'ExamplePass123'})).statusCode,400)
 assert.equal((await post('/api/auth/password/reset',{email:'new@example.test',password:'ChangedPass123',...proof})).statusCode,400)
 assert.equal((await post('/api/auth/register',{username:'email_new',displayName:'New',email:'tampered@example.test',password:'ExamplePass123',...proof})).statusCode,400)
 const verifiedReg=await post('/api/auth/register',{username:'email_new',displayName:'New',email:'new@example.test',password:'ExamplePass123',...proof})
 assert.equal(verifiedReg.statusCode,201,verifiedReg.body)
 assert.ok((await query('SELECT email_verified_at FROM users WHERE id=$1',[verifiedReg.json().user.id])).rows[0].email_verified_at)
 assert.equal((await post('/api/auth/register',{username:'replay_new',displayName:'New',email:'new@example.test',password:'ExamplePass123',...proof})).statusCode,400)
 const lockChallenge=await sendEmail('locked@example.test','reset')
 const correctCode=sentMail.at(-1).code,wrongCode=correctCode==='000000'?'111111':'000000'
 for(let i=0;i<5;i++) assert.equal((await post('/api/auth/password/reset',{email:'locked@example.test',password:'ChangedPass123',challengeId:lockChallenge.json().challengeId,code:wrongCode})).statusCode,400)
 assert.equal((await post('/api/auth/password/reset',{email:'locked@example.test',password:'ChangedPass123',challengeId:lockChallenge.json().challengeId,code:correctCode})).statusCode,400)
 const resetChallenge=await sendEmail('shared@example.test','reset'),resetCode=sentMail.at(-1).code
 const approved=(await post('/api/auth/app/requests',{challenge:pkce(verifier)})).json().id
 await post('/api/auth/app/approve',{id:approved},{cookie:cookieHeader})
 const reset=await post('/api/auth/password/reset',{email:'shared@example.test',password:'ChangedPass123',challengeId:resetChallenge.json().challengeId,code:resetCode})
 assert.equal(reset.statusCode,200,reset.body)
 assert.equal((await query('SELECT * FROM sessions WHERE user_id=$1',[id])).rows.length,0)
 assert.equal((await post('/api/auth/app/exchange',{id:approved,verifier})).statusCode,410)
 assert.equal((await post('/api/auth/login',{identifier:'shared@example.test',password:'ExamplePass123',captchaVerifyParam:'test-proof'})).statusCode,401)
 assert.equal((await post('/api/auth/login',{identifier:'shared@example.test',password:'ChangedPass123',captchaVerifyParam:'test-proof'})).statusCode,200)
 assert.equal((await post('/api/auth/password/reset',{email:'shared@example.test',password:'ChangedAgain123',challengeId:resetChallenge.json().challengeId,code:resetCode})).statusCode,400)
 const unknown=await sendEmail('unknown@example.test','reset')
 const unknownReset=await post('/api/auth/password/reset',{email:'unknown@example.test',password:'ExamplePass123',challengeId:unknown.json().challengeId,code:sentMail.at(-1).code})
 assert.equal(unknownReset.statusCode,200)
 assert.equal((await query('SELECT * FROM users WHERE email=$1',['unknown@example.test'])).rows.length,0)
 const expiredMail=await sendEmail('expired@example.test','reset'),expiredCode=sentMail.at(-1).code
 await query(`UPDATE auth_email_challenges SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1`,[expiredMail.json().challengeId])
 assert.equal((await post('/api/auth/password/reset',{email:'expired@example.test',password:'ExamplePass123',challengeId:expiredMail.json().challengeId,code:expiredCode})).statusCode,400)

})
