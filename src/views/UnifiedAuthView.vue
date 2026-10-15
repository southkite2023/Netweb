<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import LegalLinks from '../components/LegalLinks.vue'
import AliyunCaptcha from '../components/AliyunCaptcha.vue'
import { request } from '../lib/api'
import { auth } from '../lib/auth'
const { locale } = useI18n()
const words = {
 en: { '欢迎回来':'Welcome back', '创建 Yuashie 账号':'Create a Yuashie account', '找回密码':'Recover your account', '一个账号，连接 AstrAcct 与 yuashie.cn':'One account for AstrAcct and yuashie.cn', '用户名':'Username', '昵称':'Display name', '邮箱':'Email', '邮箱 / 手机号':'Email / phone number', '密码':'Password', '新密码':'New password', '确认密码':'Confirm password', '登录':'Sign in', '注册':'Create account', '注册账号':'Create an account', '返回登录':'Back to sign in', '忘记密码？':'Forgot password?', '其他方式登录':'Other sign-in options', '待开通':'Not configured', '当前使用邮箱登录；手机号验证接入后开放手机号登录。':'Use your email for now. Phone sign-in will open after phone verification is connected.', '安全验证并登录':'Verify and sign in', '安全验证并注册':'Verify and register' },
 ja: { '欢迎回来':'おかえりなさい', '创建 Yuashie 账号':'Yuashie アカウント作成', '找回密码':'パスワードの再設定', '一个账号，连接 AstrAcct 与 yuashie.cn':'AstrAcct と yuashie.cn 共通のアカウント', '用户名':'ユーザー名', '昵称':'表示名', '邮箱':'メール', '邮箱 / 手机号':'メール / 電話番号', '密码':'パスワード', '新密码':'新しいパスワード', '确认密码':'パスワード確認', '登录':'ログイン', '注册':'登録', '注册账号':'アカウント作成', '返回登录':'ログインに戻る', '忘记密码？':'パスワードを忘れた場合', '其他方式登录':'他のログイン方法', '待开通':'未設定', '当前使用邮箱登录；手机号验证接入后开放手机号登录。':'現在はメールでログインできます。電話番号認証の接続後に電話番号ログインを開始します。', '安全验证并登录':'認証してログイン', '安全验证并注册':'認証して登録' },
}
const label = value => words[locale.value]?.[value] || value
const props = defineProps({ mode:{ type:String, default:'login' } })
const route = useRoute(), router = useRouter()
const config = ref(null), error = ref(''), message = ref(''), done = ref(false), busy = ref(false), visible = ref(false)
const challengeId = ref(''), cooldown = ref(0)
let timer
const mailFlow = computed(() => props.mode !== 'login' && config.value?.emailVerification)
onBeforeUnmount(() => clearInterval(timer))
const captchaToken = ref(''), captcha = ref(null)
const form = ref({ identifier:'',email:'',username:'',displayName:'',password:'',confirm:'',code:'' })
watch(() => form.value.email, () => { challengeId.value = ''; form.value.code = '' })
const title = computed(() => label({ login:'欢迎回来',register:'创建 Yuashie 账号',reset:'找回密码' }[props.mode]))
const redirect = computed(() => {
  const value = route.query.redirect
  return typeof value === 'string' && /^\/(?!\/)/.test(value) && !/[\\\s\x00-\x1f]/.test(value) ? value : '/'
})
const link = path => ({ path,query:{ redirect:redirect.value } })
const post = (path,body) => request(path,{ method:'POST',body:JSON.stringify(body) })
onMounted(async () => {
  try { config.value = await request('/auth/config') } catch(e) { error.value = e.message }
})
async function sendCode(token) {
  if (busy.value || cooldown.value) return
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(form.value.email.trim())) { error.value = '请先填写有效邮箱。'; return }
  busy.value = true; error.value = ''; message.value = ''
  try {
    const result = await post('/auth/email/send',{email:form.value.email,purpose:props.mode === 'reset' ? 'reset' : 'register',captchaVerifyParam:typeof token === 'string' ? token : undefined})
    challengeId.value = result.challengeId; cooldown.value = result.retryAfter; message.value = result.message
    clearInterval(timer); timer = setInterval(() => { if (--cooldown.value <= 0) clearInterval(timer) },1000)
  } catch(e) { error.value = e.message }
  finally { busy.value = false; captcha.value?.reset() }
}
async function submit(token) {
  if (busy.value) return
  if (typeof token === 'string') captchaToken.value = token
  if (!document.querySelector('.auth-form')?.reportValidity()) { captchaToken.value = ''; captcha.value?.reset(); return }
  if (!mailFlow.value && config.value?.captchaRequired && !captchaToken.value) { error.value = '请点击下方按钮完成安全验证。'; return }
  error.value = ''; message.value = ''
  if (mailFlow.value && !challengeId.value) { error.value = '请先获取邮箱验证码。'; return }
  if (props.mode !== 'login' && form.value.password !== form.value.confirm) { error.value = '两次输入的密码不一致。'; return }
  busy.value = true
  try {
    let result
    if (props.mode === 'login') result = await post('/auth/login',{ identifier:form.value.identifier,password:form.value.password,captchaVerifyParam:captchaToken.value })
    else if (props.mode === 'register') result = await post('/auth/register',{ username:form.value.username,displayName:form.value.displayName,password:form.value.password,
      email:form.value.email,challengeId:challengeId.value,code:form.value.code,captchaVerifyParam:captchaToken.value })
    else {
      const reset = await post('/auth/password/reset',{email:form.value.email,challengeId:challengeId.value,code:form.value.code,password:form.value.password})
      auth.user = null; form.value.password = ''; form.value.confirm = ''; message.value = reset.message; done.value = true; return
    }
    auth.user = result.user
    router.push(redirect.value === '/' ? `/u/${result.user.username}` : redirect.value)
  } catch(e) { error.value = e.message }
  finally { busy.value = false; captchaToken.value = ''; captcha.value?.reset() }
}
function thirdParty(provider) {
  location.assign(`/api/auth/oauth/${provider}/start?${new URLSearchParams({ redirect:redirect.value })}`)
}
</script>
<template>
  <div class="container"><SiteNav />
    <main class="unified-account-shell"><section class="unified-account-card">
      <div class="account-brand">YUASHIE ACCOUNT</div>
      <h1>{{ title }}</h1>
      <p class="account-subtitle">{{ label('一个账号，连接 AstrAcct 与 yuashie.cn') }}</p>
      <p v-if="config?.captchaRequired && !config.captcha" role="alert" class="form-error">安全验证尚未完成配置，请稍后重试。</p>
      <form v-if="!done && (mode !== 'reset' || config?.passwordReset)" class="auth-form" @submit.prevent="submit">
        <template v-if="mode === 'register'">
          <label>{{ label('用户名') }}<input v-model.trim="form.username" autocomplete="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9_-]{3,24}" required placeholder="3～24 位字母、数字、_ 或 -"></label>
          <label>{{ label('昵称') }}<input v-model.trim="form.displayName" maxlength="40" required></label>
          <label>{{ label('邮箱') }}<input v-model.trim="form.email" type="email" autocomplete="email" maxlength="254" required></label>
          <p v-if="!config?.emailVerification" class="form-hint">邮箱验证暂未启用，请妥善保管密码。</p>
        </template>
        <label v-if="mode === 'reset'">邮箱<input v-model.trim="form.email" type="email" autocomplete="email" maxlength="254" required></label>
        <template v-if="mailFlow">
          <AliyunCaptcha v-if="config.captcha" ref="captcha" :config="config.captcha" :disabled="busy || cooldown > 0 || !form.email" :label="cooldown ? `${cooldown} 秒后重发` : '安全验证并发送验证码'" @verified="sendCode" />
          <button v-else type="button" class="account-secondary" :disabled="busy || cooldown > 0 || !form.email || config.captchaRequired" @click="sendCode">{{ cooldown ? `${cooldown} 秒后重发` : '发送邮箱验证码' }}</button>
          <label>邮箱验证码<input v-model.trim="form.code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required placeholder="6 位验证码，5 分钟内有效"></label>
        </template>
        <label v-if="mode === 'login'">{{ label('邮箱 / 手机号') }}<input v-model.trim="form.identifier" autocomplete="username" maxlength="254" required placeholder="请输入邮箱或已验证的手机号"></label>
        <p v-if="mode === 'login'" class="form-hint">{{ label('当前使用邮箱登录；手机号验证接入后开放手机号登录。') }}</p>
        <label>{{ label(mode === 'reset' ? '新密码' : '密码') }}<span class="account-password"><input v-model="form.password" :type="visible ? 'text' : 'password'" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" :minlength="mode === 'login' ? 1 : 8" maxlength="128" required :placeholder="mode === 'login' ? '请输入密码' : '8～128 位密码'"><button type="button" @click="visible = !visible" :aria-label="visible ? '隐藏密码' : '显示密码'">{{ visible ? '隐藏' : '显示' }}</button></span></label>
        <label v-if="mode !== 'login'">{{ label('确认密码') }}<input v-model="form.confirm" :type="visible ? 'text' : 'password'" autocomplete="new-password" minlength="8" maxlength="128" required></label>
        <p v-if="error" role="alert" class="form-error">{{ error }}</p>
        <AliyunCaptcha v-if="config?.captcha && !mailFlow" ref="captcha" :config="config.captcha" :disabled="busy" :label="mode === 'login' ? '安全验证并登录' : '安全验证并注册'" @verified="submit" />
        <button v-else class="primary-action" :disabled="busy || !config || (!mailFlow && config.captchaRequired) || (mailFlow && !challengeId)">{{ busy ? '请稍候…' : label(mode === 'login' ? '登录' : mode === 'register' ? '注册' : '重置密码') }}</button>
      </form>
      <div class="account-links"><RouterLink :to="link(mode === 'login' ? '/register' : '/login')">{{ label(mode === 'login' ? '注册账号' : '返回登录') }}</RouterLink><RouterLink v-if="mode === 'login'" :to="link('/forgot-password')">{{ label('忘记密码？') }}</RouterLink></div>
      <template v-if="mode === 'login'">
        <div class="account-divider">{{ label('其他方式登录') }}</div>
        <div class="account-providers"><button v-for="p in config?.providers || []" :key="p.id" type="button" :disabled="!p.enabled || busy" @click="thirdParty(p.id)"><span class="account-provider-mark">{{ p.id === 'qq' ? 'Q' : p.id === 'github' ? 'GH' : 'G' }}</span>{{ p.name }}<small v-if="!p.enabled">{{ label('待开通') }}</small></button></div>
      </template>
      <p v-if="message" role="status" class="account-message">{{ message }}</p>
      <p v-if="mode === 'reset' && config && !config.passwordReset" class="form-hint">邮件验证尚未启用，暂时无法自助重置密码。</p>
      <LegalLinks />
    </section></main><SiteFooter />
  </div>
</template>
