<script setup>
import { computed, onMounted, ref } from 'vue'
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
const config = ref(null), error = ref(''), busy = ref(false), visible = ref(false)
const captchaToken = ref(''), captcha = ref(null)
const form = ref({ identifier:'',email:'',username:'',displayName:'',password:'',confirm:'' })
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
async function submit(token) {
  if (busy.value) return
  if (typeof token === 'string') captchaToken.value = token
  if (!document.querySelector('.auth-form')?.reportValidity()) { captchaToken.value = ''; captcha.value?.reset(); return }
  if (config.value?.captchaRequired && !captchaToken.value) { error.value = '请点击下方按钮完成安全验证。'; return }
  error.value = ''
  if (props.mode !== 'login' && form.value.password !== form.value.confirm) { error.value = '两次输入的密码不一致。'; return }
  busy.value = true
  try {
    let result
    if (props.mode === 'login') result = await post('/auth/login',{ identifier:form.value.identifier,password:form.value.password,captchaVerifyParam:captchaToken.value })
    else if (props.mode === 'register') result = await post('/auth/register',{ username:form.value.username,displayName:form.value.displayName,password:form.value.password,
      email:form.value.email,captchaVerifyParam:captchaToken.value })
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
      <form v-if="mode !== 'reset'" class="auth-form" @submit.prevent="submit">
        <template v-if="mode === 'register'">
          <label>{{ label('用户名') }}<input v-model.trim="form.username" autocomplete="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9_-]{3,24}" required placeholder="3～24 位字母、数字、_ 或 -"></label>
          <label>{{ label('昵称') }}<input v-model.trim="form.displayName" maxlength="40" required></label>
          <label>{{ label('邮箱') }}<input v-model.trim="form.email" type="email" autocomplete="email" maxlength="254" required></label>
          <p class="form-hint">邮箱验证与邮件找回稍后开放。请妥善保管密码，密码找回将在验证服务接入后开放。</p>
        </template>
        <label v-if="mode === 'login'">{{ label('邮箱 / 手机号') }}<input v-model.trim="form.identifier" autocomplete="username" maxlength="254" required placeholder="请输入邮箱或已验证的手机号"></label>
        <p v-if="mode === 'login'" class="form-hint">{{ label('当前使用邮箱登录；手机号验证接入后开放手机号登录。') }}</p>
        <label>{{ label(mode === 'reset' ? '新密码' : '密码') }}<span class="account-password"><input v-model="form.password" :type="visible ? 'text' : 'password'" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" :minlength="mode === 'login' ? 1 : 8" maxlength="128" required :placeholder="mode === 'login' ? '请输入密码' : '8～128 位密码'"><button type="button" @click="visible = !visible" :aria-label="visible ? '隐藏密码' : '显示密码'">{{ visible ? '隐藏' : '显示' }}</button></span></label>
        <label v-if="mode !== 'login'">{{ label('确认密码') }}<input v-model="form.confirm" :type="visible ? 'text' : 'password'" autocomplete="new-password" minlength="8" maxlength="128" required></label>
        <p v-if="error" role="alert" class="form-error">{{ error }}</p>
        <AliyunCaptcha v-if="config?.captcha" ref="captcha" :config="config.captcha" :disabled="busy" :label="mode === 'login' ? '安全验证并登录' : '安全验证并注册'" @verified="submit" />
        <button v-else class="primary-action" :disabled="busy || !config || config.captchaRequired">{{ busy ? '请稍候…' : label(mode === 'login' ? '登录' : mode === 'register' ? '注册' : '重置密码') }}</button>
      </form>
      <div class="account-links"><RouterLink :to="link(mode === 'login' ? '/register' : '/login')">{{ label(mode === 'login' ? '注册账号' : '返回登录') }}</RouterLink><RouterLink v-if="mode === 'login'" :to="link('/forgot-password')">{{ label('忘记密码？') }}</RouterLink></div>
      <template v-if="mode === 'login'">
        <div class="account-divider">{{ label('其他方式登录') }}</div>
        <div class="account-providers"><button v-for="p in config?.providers || []" :key="p.id" type="button" :disabled="!p.enabled || busy" @click="thirdParty(p.id)"><span class="account-provider-mark">{{ p.id === 'qq' ? 'Q' : p.id === 'github' ? 'GH' : 'G' }}</span>{{ p.name }}<small v-if="!p.enabled">{{ label('待开通') }}</small></button></div>
      </template>
      <p v-if="mode === 'reset'" class="form-hint">邮箱发送与短信发送尚未接入，目前暂无法自助重置密码。人机验证不能代替邮箱或手机号归属验证。</p>
      <LegalLinks />
    </section></main><SiteFooter />
  </div>
</template>
