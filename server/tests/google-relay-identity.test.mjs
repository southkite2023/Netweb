import test from 'node:test'
import assert from 'node:assert/strict'
import {generateKeyPair,exportJWK,SignJWT} from 'jose'
test('relay transports real signed Google-format tokens without relaxing identity validation',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256')
 const key={...await exportJWK(publicKey),kid:'test-key',use:'sig',alg:'RS256'}
 const original=globalThis.fetch, saved={...process.env}
 process.env.GOOGLE_AUTH_RELAY_ORIGIN='https://google-auth.yuashie.com'
 process.env.OAUTH_GOOGLE_CLIENT_ID='test-client'
 process.env.OAUTH_GOOGLE_CLIENT_SECRET='test-secret'
 let token,tokenCalls=0,keyCalls=0
 globalThis.fetch=async(input,init)=>{
  const url=String(input)
  if(url==='https://google-auth.yuashie.com/token'){
   tokenCalls++;assert.equal(init.redirect,'error');assert.equal(new URLSearchParams(init.body).get('client_secret'),'test-secret')
   return new Response(JSON.stringify({access_token:'test-access',id_token:token}),{headers:{'Content-Type':'application/json'}})
  }
  assert.equal(url,'https://google-auth.yuashie.com/certs');assert.equal(init.redirect,'error');keyCalls++
  return new Response(JSON.stringify({keys:[key]}),{headers:{'Content-Type':'application/json'}})
 }
 try{
  const {oauthIdentity}=await import('../src/auth-providers.js')
  const sign=(nonce='test-nonce',audience='test-client',exp='1h')=>new SignJWT({nonce,name:'Test user'}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer('https://accounts.google.com').setAudience(audience).setSubject('test-google-subject').setIssuedAt().setExpirationTime(exp).sign(privateKey)
  const state={nonce:'test-nonce',verifier:'test-verifier'}
  token=await sign();assert.deepEqual(await oauthIdentity('google','test-code',state,'https://yuashie.cn'),{subject:'test-google-subject',name:'Test user'})
  token=await sign('wrong-nonce');await assert.rejects(oauthIdentity('google','test-code',state,'https://yuashie.cn'),/Invalid Google identity/)
  token=await sign('test-nonce','wrong-audience');await assert.rejects(oauthIdentity('google','test-code',state,'https://yuashie.cn'))
  token=await sign('test-nonce','test-client','-1h');await assert.rejects(oauthIdentity('google','test-code',state,'https://yuashie.cn'))
  const wrong=await generateKeyPair('RS256');token=await new SignJWT({nonce:'test-nonce'}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer('https://accounts.google.com').setAudience('test-client').setSubject('test-google-subject').setIssuedAt().setExpirationTime('1h').sign(wrong.privateKey)
  await assert.rejects(oauthIdentity('google','test-code',state,'https://yuashie.cn'))
  assert.equal(tokenCalls,5);assert.equal(keyCalls,1)
 }finally{globalThis.fetch=original;for(const k of ['GOOGLE_AUTH_RELAY_ORIGIN','OAUTH_GOOGLE_CLIENT_ID','OAUTH_GOOGLE_CLIENT_SECRET']){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k]}}
})
