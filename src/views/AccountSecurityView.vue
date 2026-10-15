<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { request } from '../lib/api'
import { useRouter, useRoute } from 'vue-router'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import AliyunCaptcha from '../components/AliyunCaptcha.vue'
const router=useRouter(),route=useRoute(),config=ref(null),identity=ref(null),error=ref(''),message=ref(''),busy=ref(false)
const challengeId=ref(''),code=ref(''),cooldown=ref(0),captcha=ref(null)
let timer
onMounted(async()=>{
 try { await request('/auth/me'); config.value=await request('/auth/config');identity.value=await request('/auth/email/status') }
 catch(e) { if(e.status===401) router.replace({path:'/login',query:{redirect:route.fullPath}});else error.value=e.message }
})
onBeforeUnmount(()=>clearInterval(timer))
const post=(path,body)=>request(path,{method:'POST',body:JSON.stringify(body)})
async function send(token) {
 if(busy.value||cooldown.value) return
 busy.value=true;error.value='';message.value=''
 try {
   const result=await post('/auth/email/send',{email:identity.value.email,purpose:'verify',captchaVerifyParam:typeof token==='string'?token:undefined})
   challengeId.value=result.challengeId;cooldown.value=result.retryAfter;message.value=result.message
   clearInterval(timer);timer=setInterval(()=>{if(--cooldown.value<=0)clearInterval(timer)},1000)
 } catch(e){error.value=e.message}finally{busy.value=false;captcha.value?.reset()}
}
async function verify() {
 busy.value=true;error.value=''
 try {await post('/auth/email/verify',{challengeId:challengeId.value,code:code.value});identity.value.verified=true;message.value='邮箱已验证，可用于找回密码。'}
 catch(e){error.value=e.message}finally{busy.value=false}
}
async function link(id) {
 busy.value=true;error.value=''
 try {const result=await post(`/auth/oauth/${id}/link`,{redirect:'/auth/security'});location.assign(result.url)}catch(e){error.value=e.message;busy.value=false}
}
</script>
<template><div class="container"><SiteNav /><main class="unified-account-shell"><section class="unified-account-card">
<h1>账号安全</h1>
<template v-if="identity?.email"><h2>邮箱验证</h2><p>{{ identity.email }}</p><p v-if="identity.verified">邮箱已验证。</p>
<form v-else-if="config?.emailVerification" class="auth-form" @submit.prevent="verify">
<AliyunCaptcha v-if="config.captcha" ref="captcha" :config="config.captcha" :disabled="busy || cooldown > 0" :label="cooldown ? `${cooldown} 秒后重发` : '安全验证并发送验证码'" @verified="send" />
<button v-else type="button" class="account-secondary" :disabled="busy || cooldown > 0 || config.captchaRequired" @click="send">{{ cooldown ? `${cooldown} 秒后重发` : '发送邮箱验证码' }}</button>
<label>验证码<input v-model.trim="code" inputmode="numeric" autocomplete="one-time-code" required pattern="[0-9]{6}" maxlength="6"></label>
<button class="primary-action" :disabled="busy || !challengeId">确认验证</button></form>
<p v-else>邮件验证尚未启用。</p></template>
<p v-else-if="identity">当前账号未绑定邮箱，请继续使用已绑定的第三方方式登录。</p>
<h2>绑定第三方账号</h2><p class="form-hint">已有网站账号请先登录，再绑定第三方身份，之后可通过任一入口登录同一账号。</p>
<div class="account-providers"><button v-for="p in config?.providers || []" :key="p.id" :disabled="busy || !p.enabled" @click="link(p.id)">{{ p.name }}{{ p.enabled ? '' : ' · 待开通' }}</button></div>
<p v-if="message" role="status">{{ message }}</p><p v-if="error" role="alert" class="form-error">{{ error }}</p>
</section></main><SiteFooter /></div></template>
