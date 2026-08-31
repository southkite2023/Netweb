<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { api } from '../lib/api'
import { auth } from '../lib/auth'

const { locale } = useI18n()
const route = useRoute()
const router = useRouter()
const form = ref({ username: '', displayName: '', email: '', password: '', confirm: '' })
const busy = ref(false)
const error = ref('')

const copy = computed(() => ({
  zh: ['创建账户','加入 YUASHIE 节点。你的用户名将成为公开主页地址。','用户名','昵称','邮箱','密码','确认密码','创建账户','已有账户？登录','密码至少 6 位，用户名仅支持字母、数字、下划线和连字符。','两次输入的密码不一致。'],
  en: ['CREATE ACCOUNT','Join the YUASHIE node. Your username becomes your public profile address.','Username','Display name','Email','Password','Confirm password','Create account','Already a member? Sign in','Use at least 6 characters. Usernames support letters, numbers, underscores and hyphens.','Passwords do not match.'],
  ja: ['アカウント作成','YUASHIE ノードに参加します。ユーザー名は公開プロフィールのURLになります。','ユーザー名','表示名','メール','パスワード','パスワード確認','アカウント作成','アカウントをお持ちですか？ログイン','パスワードは6文字以上。ユーザー名は英数字・_・- が使えます。','パスワードが一致しません。'],
}[locale.value] || []))

const safeRedirect = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : null
})

const loginTo = computed(() => safeRedirect.value
  ? { path: '/login', query: { redirect: safeRedirect.value } }
  : '/login')

async function submit() {
  error.value = ''
  if (form.value.password !== form.value.confirm) {
    error.value = copy.value[10]
    return
  }
  busy.value = true
  try {
    const r = await api.register(form.value)
    auth.user = r.user
    router.push(safeRedirect.value || `/u/${r.user.username}`)
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="container">
    <SiteNav />
    <main class="auth-shell">
      <section class="auth-panel">
        <div class="auth-kicker">// YUASHIE ACCOUNT · 0.3.1</div>
        <h1>{{ copy[0] }}</h1>
        <p class="auth-lead">{{ copy[1] }}</p>
        <form class="auth-form" @submit.prevent="submit">
          <label>{{ copy[2] }}<input v-model.trim="form.username" autocomplete="username" required minlength="3" maxlength="24" placeholder="yuashie_user"></label>
          <label>{{ copy[3] }}<input v-model.trim="form.displayName" required maxlength="40"></label>
          <label>{{ copy[4] }}<input v-model.trim="form.email" type="email" autocomplete="email" required></label>
          <label>{{ copy[5] }}<input v-model="form.password" type="password" autocomplete="new-password" required minlength="6"></label>
          <label>{{ copy[6] }}<input v-model="form.confirm" type="password" autocomplete="new-password" required minlength="6"></label>
          <p class="form-hint">{{ copy[9] }}</p>
          <p v-if="error" class="form-error">{{ error }}</p>
          <button class="primary-action" :disabled="busy">{{ busy ? '...' : copy[7] }}</button>
        </form>
        <RouterLink class="auth-switch" :to="loginTo">{{ copy[8] }}</RouterLink>
      </section>
      <aside class="auth-aside"><span>IDENTITY</span><strong>01</strong><p>PROFILE / COMMENTS / FEEDBACK / MINECRAFT</p></aside>
    </main>
    <SiteFooter />
  </div>
</template>
