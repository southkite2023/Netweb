import test from 'node:test'
import assert from 'node:assert/strict'
import {credentialsConfigured,createCredentialProvider,aliyunRpc} from '../src/aliyun-credentials.js'
import {accountConfig} from '../src/auth-providers.js'
test('ECS role configuration needs no permanent key and never falls back to static credentials',()=>{
 assert.equal(credentialsConfigured({ALIBABA_CLOUD_CREDENTIALS_TYPE:'ecs_ram_role'}),true)
 assert.equal(credentialsConfigured({}),false)
 assert.throws(()=>createCredentialProvider({}),/not configured/)
 const cfg=accountConfig({ALIBABA_CLOUD_CREDENTIALS_TYPE:'ecs_ram_role',ALIYUN_CAPTCHA_ENABLED:'true',ALIYUN_CAPTCHA_SCENE_ID:'scene',ALIYUN_CAPTCHA_PREFIX:'prefix',ALIYUN_MAIL_ENABLED:'true',ALIYUN_MAIL_FROM:'verify@example.test'})
 assert.equal(cfg.captchaConfigured,true);assert.equal(cfg.emailVerification,true);assert.equal(cfg.passwordReset,true)
})
test('every API call uses the current SDK credential including its temporary security token',async()=>{
 let generation=0;const clients=[]
 const provider={getCredential:async()=>({accessKeyId:`id-${++generation}`,accessKeySecret:'secret',securityToken:`token-${generation}`})}
 class Client {constructor(config){clients.push(config)} async request(action,params,options){return {action,params,options}}}
 for(let i=0;i<2;i++) await aliyunRpc('dm.aliyuncs.com','2015-11-23','SingleSendMail',{value:1},{provider,Client})
 assert.equal(generation,2);assert.equal(clients[0].securityToken,'token-1');assert.equal(clients[1].securityToken,'token-2')
 assert.equal(clients[1].endpoint,'https://dm.aliyuncs.com')
})
