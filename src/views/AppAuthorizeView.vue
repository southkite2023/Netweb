<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { request } from '../lib/api'
import { auth } from '../lib/auth'
const route = useRoute(), router = useRouter(), error = ref(''), done = ref(false), ready = ref(false), busy = ref(false)
onMounted(async () => {
  try {
    await request(`/auth/app/requests/${encodeURIComponent(route.query.request || '')}`)
    const result = await request('/auth/me'); auth.user = result.user; ready.value = true
  } catch(e) {
    if (e.status === 401) router.replace({ path:'/login',query:{ redirect:route.fullPath } })
    else error.value = e.message
  }
})
async function approve() {
  busy.value = true
  try { await request('/auth/app/approve',{ method:'POST',body:JSON.stringify({ id:route.query.request }) }); done.value = true }
  catch(e) { error.value = e.message } finally { busy.value = false }
}
</script>
<template><div class="container"><SiteNav /><main class="unified-account-shell"><section class="unified-account-card"><div class="account-brand">YUASHIE ACCOUNT</div><h1>{{ done ? '登录已确认' : '登录 AstrAcct' }}</h1><p v-if="done" role="status">请返回软件，登录将自动完成。</p><template v-else><p>使用 {{ auth.user?.displayName || '当前账号' }} 登录星账 AstrAcct。</p><p class="form-hint">仅在你刚刚从软件发起登录时确认。登录账号不会自动上传余额账户中的 API Key。</p><button class="primary-action" :disabled="!ready || busy" @click="approve">{{ busy ? '确认中…' : '确认登录' }}</button><RouterLink class="auth-switch" :to="{path:'/login',query:{redirect:route.fullPath}}">使用其他账号</RouterLink></template><p v-if="error" role="alert" class="form-error">{{ error }}</p></section></main><SiteFooter /></div></template>
