import crypto from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { aliyunRpc } from './aliyun-credentials.js'
import { safeEqual } from './cloud-sync.js'
export const normalizeEmail = value => typeof value === 'string' && value.trim().length <= 254 && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value.trim()) ? value.trim().toLowerCase() : null
export const emailCodeHash = (secret,id,email,purpose,code) => crypto.createHmac('sha256',secret).update(`${id}:${email}:${purpose}:${code}`).digest('hex')
const template = readFile(new URL('../templates/verification.html',import.meta.url),'utf8')
export async function sendVerificationEmail(email,code,purpose) {
  const action = {register:'注册 Yuashie 账号',reset:'重置 Yuashie 账号密码',verify:'验证 Yuashie 账号邮箱'}[purpose]
  if (!action || !normalizeEmail(email) || !/^\d{6}$/.test(code)) throw new Error('Invalid verification email')
  const html = (await template).replaceAll('{Action}',action).replaceAll('{Code}',code).replaceAll('{Minutes}','5')
  const result = await aliyunRpc('dm.aliyuncs.com','2015-11-23','SingleSendMail',{
    AccountName:process.env.ALIYUN_MAIL_FROM, AddressType:1, ReplyToAddress:false, ToAddress:email,
    Subject:'Yuashie 账号验证码', FromAlias:'Yuashie 账号安全', HtmlBody:html, ClickTrace:'0',
  })
  if (!result.RequestId) throw new Error('Email delivery was not accepted')
}
export async function consumeEmailCode(db,secret,{challengeId,email,purpose,code}) {
  if (!/^[\da-f-]{36}$/i.test(challengeId || '') || !/^\d{6}$/.test(code || '')) return false
  const {rows} = await db.query(`SELECT * FROM auth_email_challenges WHERE id=$1 AND email=$2 AND purpose=$3 AND sent=TRUE AND used_at IS NULL AND expires_at>NOW() AND attempts<5 FOR UPDATE`,[challengeId,email,purpose])
  if (!rows[0]) return false
  const valid = safeEqual(rows[0].code_hash,emailCodeHash(secret,challengeId,email,purpose,code))
  await db.query('UPDATE auth_email_challenges SET attempts=attempts+1,used_at=CASE WHEN $2 THEN NOW() ELSE used_at END WHERE id=$1',[challengeId,valid])
  return valid
}
