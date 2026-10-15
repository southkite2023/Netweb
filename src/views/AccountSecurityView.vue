<script setup>
import { onMounted, ref } from 'vue'
import { request } from '../lib/api'
import { useRouter, useRoute } from 'vue-router'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
const router = useRouter(), route = useRoute(), config = ref(null), error = ref(''), busy = ref(false)
onMounted(async () => { try { await request('/auth/me'); config.value = await request('/auth/config') } catch(e) { if(e.status === 401) router.replace({path:'/login',query:{redirect:route.fullPath}}); else error.value = e.message } })
async function link(id) {
 busy.value = true; error.value = ''
 try { const r = await request(`/auth/oauth/${id}/link`,{method:'POST',body:JSON.stringify({redirect:'/auth/security'})}); location.assign(r.url) } catch(e) { error.value = e.message; busy.value = false }
}
</script>
<template><div class="container"><SiteNav /><main class="unified-account-shell"><section class="unified-account-card"><h1>账号安全</h1><p>邮箱与手机号验证将在发送服务接入后开放。</p><h2>绑定第三方账号</h2><p class="form-hint">已有网站账号请先登录，再绑定第三方身份，之后可通过任一入口登录同一账号。</p><div class="account-providers"><button v-for="p in config?.providers || []" :key="p.id" :disabled="busy || !p.enabled" @click="link(p.id)">{{ p.name }}{{ p.enabled ? '' : ' · 待开通' }}</button></div><p v-if="error" role="alert" class="form-error">{{ error }}</p></section></main><SiteFooter /></div></template>
