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
const form = ref({ email: '', password: '' })
const busy = ref(false)
const error = ref('')

const c = computed(() => ({
  zh: ['登录','重新连接到你的 YUASHIE Account。','邮箱','密码','登录','还没有账户？创建账户'],
  en: ['SIGN IN','Reconnect to your YUASHIE Account.','Email','Password','Sign in','New here? Create an account'],
  ja: ['ログイン','YUASHIE Account に再接続します。','メール','パスワード','ログイン','初めてですか？アカウント作成'],
}[locale.value]))

const safeRedirect = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : null
})

const registerTo = computed(() => safeRedirect.value
  ? { path: '/register', query: { redirect: safeRedirect.value } }
  : '/register')

async function submit() {
  busy.value = true
  error.value = ''
  try {
    const r = await api.login(form.value)
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
        <div class="auth-kicker">// SECURE SESSION</div>
        <h1>{{ c[0] }}</h1>
        <p class="auth-lead">{{ c[1] }}</p>
        <form class="auth-form" @submit.prevent="submit">
          <label>{{ c[2] }}<input v-model.trim="form.email" type="email" autocomplete="email" required></label>
          <label>{{ c[3] }}<input v-model="form.password" type="password" autocomplete="current-password" required></label>
          <p v-if="error" class="form-error">{{ error }}</p>
          <button class="primary-action" :disabled="busy">{{ busy ? '...' : c[4] }}</button>
        </form>
        <RouterLink class="auth-switch" :to="registerTo">{{ c[5] }}</RouterLink>
      </section>
      <aside class="auth-aside"><span>SESSION</span><strong>02</strong><p>HTTPONLY / SECURE / SAME-SITE</p></aside>
    </main>
    <SiteFooter />
  </div>
</template>
