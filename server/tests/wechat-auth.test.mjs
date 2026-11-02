import test from 'node:test'
import assert from 'node:assert/strict'
import { accountConfig, authorizationUrl, oauthIdentity } from '../src/auth-providers.js'

test('WeChat authorization and identity exchange reject upstream failures', async () => {
 const originalFetch=globalThis.fetch
 const originalId=process.env.OAUTH_WECHAT_CLIENT_ID
 const originalSecret=process.env.OAUTH_WECHAT_CLIENT_SECRET
 process.env.OAUTH_WECHAT_CLIENT_ID='test-app'
 process.env.OAUTH_WECHAT_CLIENT_SECRET='test-secret'
 try {
  assert.equal(accountConfig({}).providers.some(p=>p.id==='wechat'),false)
  assert.equal(accountConfig({OAUTH_WECHAT_ENABLED:'true'}).providers.find(p=>p.id==='wechat').enabled,false)
  assert.equal(accountConfig({OAUTH_WECHAT_ENABLED:'true',OAUTH_WECHAT_CLIENT_ID:'test',OAUTH_WECHAT_CLIENT_SECRET:'secret'}).providers.find(p=>p.id==='wechat').enabled,true)
  const url=new URL(authorizationUrl('wechat','https://yuashie.cn','state-proof','verifier','nonce'))
  assert.equal(url.searchParams.get('appid'),'test-app')
  assert.equal(url.searchParams.get('scope'),'snsapi_login')
  assert.equal(url.searchParams.get('state'),'state-proof')
  assert.equal(url.searchParams.has('code_challenge'),false)
  assert.equal(url.searchParams.has('client_id'),false)
  assert.equal(url.searchParams.get('redirect_uri'),'https://yuashie.cn/api/auth/oauth/wechat/callback')
  let replies=[]
  globalThis.fetch=async(input)=>{
   assert.equal(new URL(input).hostname,'api.weixin.qq.com')
   return new Response(JSON.stringify(replies.shift()),{status:200})
  }
  replies=[{access_token:'token',openid:'openid-1'},{openid:'openid-1',nickname:'测试',unionid:'union-1'}]
  assert.deepEqual(await oauthIdentity('wechat','code',{},'https://yuashie.cn'),{subject:'openid-1',name:'测试'})
  replies=[{errcode:40029,errmsg:'invalid code'}]
  await assert.rejects(oauthIdentity('wechat','code',{},'https://yuashie.cn'))
  replies=[{access_token:'token',openid:'openid-1'},{openid:'other'}]
  await assert.rejects(oauthIdentity('wechat','code',{},'https://yuashie.cn'))
 } finally {
  globalThis.fetch=originalFetch
  for(const [key,value] of [['OAUTH_WECHAT_CLIENT_ID',originalId],['OAUTH_WECHAT_CLIENT_SECRET',originalSecret]]) {
   if(value===undefined)delete process.env[key];else process.env[key]=value
  }
 }
})
