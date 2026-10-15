import test from 'node:test'
import assert from 'node:assert/strict'
import {sendVerificationSms,checkVerificationSms} from '../src/phone-verification.js'
import {accountConfig} from '../src/auth-providers.js'

test('PNVS sends six-digit managed codes and checks the actual verification verdict',async()=>{
 const sent=[]
 const rpc=async(...args)=>{sent.push(args);return {Code:'OK',Success:true,Model:{VerifyCode:'123456',VerifyResult:'PASS'}}}
 const id='11111111-1111-4111-8111-111111111111'
 const result=await sendVerificationSms('+8613800138000',id,'test-scheme',rpc)
 assert.deepEqual(result,{code:'123456'})
 assert.equal(sent[0][0],'dypnsapi.aliyuncs.com');assert.equal(sent[0][2],'SendSmsVerifyCode')
 const params=sent[0][3]
 assert.equal(params.PhoneNumber,'13800138000');assert.equal(params.OutId,id)
 assert.equal(params.CodeLength,6);assert.equal(params.ValidTime,300);assert.equal(params.ReturnVerifyCode,true)
 assert.equal(JSON.parse(params.TemplateParam).code,'##code##')
 assert.equal(await checkVerificationSms('+8613800138000','123456',id,'test-scheme',rpc),true)
 assert.equal(sent[1][2],'CheckSmsVerifyCode');assert.equal(sent[1][3].SchemeName,params.SchemeName)
 for(const response of [{Code:'OK',Success:true,Model:{VerifyResult:'UNKNOWN'}},{Code:'OK',Success:true,Model:{}},{Code:'FAIL',Success:true,Model:{VerifyResult:'PASS'}},{Code:'OK',Success:false,Model:{VerifyResult:'PASS'}}]) {
  assert.equal(await checkVerificationSms('+8613800138000','123456',id,'',async()=>response),false)
 }
 await assert.rejects(()=>sendVerificationSms('+8613800138000',id,'',async()=>({Code:'OK',Success:true,Model:{}})))
 const env={ALIBABA_CLOUD_CREDENTIALS_TYPE:'ecs_ram_role',ALIYUN_PNVS_ENABLED:'true',ALIYUN_PNVS_SIGN_NAME:'test',ALIYUN_PNVS_TEMPLATE_CODE:'100001'}
 assert.equal(accountConfig(env).sms,true)
 assert.equal(accountConfig({...env,ALIYUN_PNVS_TEMPLATE_CODE:''}).sms,false)
 assert.equal(accountConfig({...env,ALIYUN_PNVS_SCHEME_NAME:'x'.repeat(21)}).sms,false)
 assert.equal(accountConfig({ALIBABA_CLOUD_CREDENTIALS_TYPE:'ecs_ram_role',ALIYUN_SMS_ENABLED:'true',ALIYUN_SMS_SIGN_NAME:'test',ALIYUN_SMS_TEMPLATE_CODE:'SMS_123'}).sms,false)
})
