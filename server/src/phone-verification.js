import crypto from 'node:crypto'
import { aliyunRpc } from './aliyun-credentials.js'
import { normalizePhone } from './auth-providers.js'
import { safeEqual } from './cloud-sync.js'
export const phoneCodeHash = (secret,id,phone,purpose,code) => crypto.createHmac('sha256',secret).update(`sms:${id}:${phone}:${purpose}:${code}`).digest('hex')
// PNVS generates the code. It is returned only to this server, hashed, and never sent to the browser.
export async function sendVerificationSms(phone,outId,scheme='',rpc=aliyunRpc) {
  if (!normalizePhone(phone) || !/^[\da-f-]{36}$/i.test(outId)) throw new Error('Invalid SMS request')
  const result = await rpc('dypnsapi.aliyuncs.com','2017-05-25','SendSmsVerifyCode',{
    CountryCode:'86', PhoneNumber:phone.slice(3), SignName:process.env.ALIYUN_PNVS_SIGN_NAME,
    TemplateCode:process.env.ALIYUN_PNVS_TEMPLATE_CODE, TemplateParam:JSON.stringify({code:'##code##',min:'5'}),
    ...(scheme?{SchemeName:scheme}:{}), OutId:outId, CodeLength:6, CodeType:1,
    ValidTime:300, Interval:60, DuplicatePolicy:1, ReturnVerifyCode:true,
  })
  if (result.Code !== 'OK' || result.Success !== true || !/^\d{6}$/.test(result.Model?.VerifyCode || '')) throw new Error('SMS delivery was not accepted')
  return {code:result.Model.VerifyCode}
}
export async function checkVerificationSms(phone,code,outId,scheme='',rpc=aliyunRpc) {
  const result=await rpc('dypnsapi.aliyuncs.com','2017-05-25','CheckSmsVerifyCode',{
    CountryCode:'86',PhoneNumber:phone.slice(3),VerifyCode:code,OutId:outId,...(scheme?{SchemeName:scheme}:{}),
  })
  return result.Code==='OK' && result.Success===true && result.Model?.VerifyResult==='PASS'
}
export async function consumePhoneCode(db,secret,{challengeId,phone,purpose,code},userId=null,verify=checkVerificationSms) {
  if (!/^[\da-f-]{36}$/i.test(challengeId || '') || !/^\d{6}$/.test(code || '')) return false
  const {rows} = await db.query(`SELECT * FROM auth_phone_challenges WHERE id=$1 AND phone=$2 AND purpose=$3 AND sent=TRUE AND used_at IS NULL AND expires_at>NOW() AND attempts<5 AND user_id IS NOT DISTINCT FROM $4::bigint FOR UPDATE`,[challengeId,phone,purpose,userId])
  if (!rows[0]) return false
  // Bind the exact upstream-generated code to our purpose, challenge and owner before upstream verification.
  let valid=safeEqual(rows[0].code_hash,phoneCodeHash(secret,challengeId,phone,purpose,code))
  if(valid) { try{valid=await verify(phone,code,challengeId,rows[0].scheme_name)}catch{valid=false} }
  await db.query('UPDATE auth_phone_challenges SET attempts=attempts+1,used_at=CASE WHEN $2 THEN NOW() ELSE used_at END WHERE id=$1',[challengeId,valid])
  return valid
}
