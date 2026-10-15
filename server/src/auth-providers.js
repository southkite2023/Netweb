import { aliyunRpc, credentialsConfigured } from './aliyun-credentials.js'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import crypto from 'node:crypto'

export const digest = value => crypto.createHash('sha256').update(value).digest('hex')
export const pkce = value => crypto.createHash('sha256').update(value).digest('base64url')
export function normalizePhone(value) {
  if (typeof value !== 'string') return null
  const phone = value.trim().replace(/^\+?86/, '')
  return /^1[3-9]\d{9}$/.test(phone) ? `+86${phone}` : null
}
export function localRedirect(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\\\s\x00-\x1f]/.test(value) || value.startsWith('//') || value.length > 600) return '/'
  const parsed = new URL(value, 'https://yuashie.cn')
  return parsed.origin === 'https://yuashie.cn' ? parsed.pathname + parsed.search : '/'
}
export function accountConfig(env = process.env) {
  const keys = credentialsConfigured(env)
  const captcha = !!(env.ALIYUN_CAPTCHA_SCENE_ID && env.ALIYUN_CAPTCHA_PREFIX)
  const captchaRequired = env.ALIYUN_CAPTCHA_ENABLED === 'true'
  const email = !!(keys && env.ALIYUN_MAIL_ENABLED === 'true' && env.ALIYUN_MAIL_FROM)
  return {
    captchaRequired, captchaConfigured: !!(keys && captcha), sms: false, passwordReset: email, emailVerification: email,
    captcha: captchaRequired && captcha ? { sceneId: env.ALIYUN_CAPTCHA_SCENE_ID, prefix: env.ALIYUN_CAPTCHA_PREFIX, region: env.ALIYUN_CAPTCHA_REGION === 'sgp' ? 'sgp' : 'cn' } : null,
    providers: ['qq','github','google'].map(id => ({ id, name: {qq:'QQ',github:'GitHub',google:'Google'}[id], enabled: !!(env[`OAUTH_${id.toUpperCase()}_CLIENT_ID`] && env[`OAUTH_${id.toUpperCase()}_CLIENT_SECRET`]) })),
  }
}
export async function verifyCaptcha(param) {
  if (!accountConfig().captchaConfigured || typeof param !== 'string' || !param || param.length > 16000) return false
  const endpoint = process.env.ALIYUN_CAPTCHA_REGION === 'sgp' ? 'captcha.ap-southeast-1.aliyuncs.com' : 'captcha.cn-shanghai.aliyuncs.com'
  const result = await aliyunRpc(endpoint, '2023-03-05', 'VerifyIntelligentCaptcha', { CaptchaVerifyParam: param, SceneId: process.env.ALIYUN_CAPTCHA_SCENE_ID })
  return result.Code === 'Success' && result.Result?.VerifyResult === true
}
const endpoints = {
  github: ['https://github.com/login/oauth/authorize','https://github.com/login/oauth/access_token','read:user'],
  google: ['https://accounts.google.com/o/oauth2/v2/auth','https://oauth2.googleapis.com/token','openid email profile'],
  qq: ['https://graph.qq.com/oauth2.0/authorize','https://graph.qq.com/oauth2.0/token','get_user_info'],
}
export function authorizationUrl(provider, origin, state, verifier, nonce) {
  const [authorize,,scope] = endpoints[provider]
  const url = new URL(authorize)
  url.search = new URLSearchParams({ client_id: process.env[`OAUTH_${provider.toUpperCase()}_CLIENT_ID`], response_type:'code', redirect_uri:`${origin}/api/auth/oauth/${provider}/callback`, scope, state })
  if (provider !== 'qq') { url.searchParams.set('code_challenge', pkce(verifier)); url.searchParams.set('code_challenge_method','S256') }
  if (provider === 'google') { url.searchParams.set('nonce',nonce); url.searchParams.set('prompt','select_account') }
  return url.href
}
async function fetchJson(url, options = {}) {
  const r = await fetch(url, { ...options, signal: AbortSignal.timeout(10000), redirect:'error' })
  if (!r.ok) throw new Error('OAuth upstream unavailable')
  return r.json()
}
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
export async function oauthIdentity(provider, code, state, origin) {
  const clientId = process.env[`OAUTH_${provider.toUpperCase()}_CLIENT_ID`]
  const params = new URLSearchParams({ grant_type:'authorization_code', code, client_id:clientId,
    client_secret:process.env[`OAUTH_${provider.toUpperCase()}_CLIENT_SECRET`], redirect_uri:`${origin}/api/auth/oauth/${provider}/callback` })
  if (provider !== 'qq') params.set('code_verifier',state.verifier)
  if (provider === 'qq') { params.set('fmt','json'); params.set('need_openid','1') }
  const token = await fetchJson(endpoints[provider][1] + (provider === 'qq' ? `?${params}` : ''), provider === 'qq' ? {} : {
    method:'POST', headers:{ Accept:'application/json','Content-Type':'application/x-www-form-urlencoded' }, body:params.toString(),
  })
  if (token.error || typeof token.access_token !== 'string') throw new Error('OAuth exchange failed')
  if (provider === 'github') {
    const user = await fetchJson('https://api.github.com/user', { headers:{ Authorization:`Bearer ${token.access_token}`, Accept:'application/vnd.github+json','User-Agent':'Yuashie-Accounts' } })
    if (!Number.isSafeInteger(user.id) || user.id <= 0) throw new Error('Invalid GitHub identity')
    return { subject:String(user.id), name:user.name || user.login }
  }
  if (provider === 'google') {
    const { payload } = await jwtVerify(token.id_token, googleKeys, { issuer:['https://accounts.google.com','accounts.google.com'], audience:clientId })
    if (!payload.sub || payload.nonce !== state.nonce) throw new Error('Invalid Google identity')
    return { subject:payload.sub, name:payload.name || 'Google user' }
  }
  if (typeof token.openid !== 'string' || !/^[A-Za-z0-9_-]{1,255}$/.test(token.openid)) throw new Error('Invalid QQ identity')
  return { subject:token.openid, name:'QQ 用户' }
}
