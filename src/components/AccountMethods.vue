<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { request } from '../lib/api'
import AliyunCaptcha from './AliyunCaptcha.vue'
const router=useRouter(),route=useRoute(),config=ref(null),methods=ref(null),busy=ref(false),error=ref(''),message=ref('')
const password=ref(''),newPassword=ref(''),confirmPassword=ref(''),channel=ref('password'),proof=ref(''),challenge=ref(''),code=ref(''),cooldown=ref(0),captcha=ref(null)
const contactType=ref('email'),contact=ref(''),pendingRemoval=ref('')
let timer
const post=(path,body)=>request(path,{method:'POST',body:JSON.stringify(body)})
const providers=computed(()=>config.value?.providers || [])
const reauthChannels=computed(()=>[
 ...(methods.value?.password?[{id:'password',name:'当前密码'}]:[]),
 ...(methods.value?.emailVerified && config.value?.emailVerification?[{id:'email',name:'已绑定邮箱'}]:[]),
 ...(methods.value?.phoneVerified && config.value?.sms?[{id:'phone',name:'已绑定手机号'}]:[]),
])
const returnPath=computed(()=>route.path.startsWith('/u/')?route.path:'/auth/security')
async function load(){
 const [c,m]=await Promise.all([request('/auth/config'),request('/auth/methods')]);config.value=c;methods.value=m
 if(!reauthChannels.value.some(item=>item.id===channel.value))channel.value=reauthChannels.value[0]?.id || ''
}
onMounted(async()=>{try{await load()}catch(e){error.value=e.message;if(e.status===401)router.replace({path:'/login',query:{redirect:route.fullPath}})}})
onBeforeUnmount(()=>clearInterval(timer))
function resetCode(){challenge.value='';code.value='';proof.value=''}
watch([channel,contactType,contact],resetCode)
async function run(fn){
 if(busy.value)return
 busy.value=true;error.value='';message.value=''
 try{await fn()}catch(e){error.value=e.message;if(e.status===403 && methods.value)methods.value.fresh=false}
 finally{busy.value=false;captcha.value?.reset()}
}
async function send(token){
 if(cooldown.value)return
 await run(async()=>{
   const kind=methods.value.fresh?contactType.value:channel.value
   const value=methods.value.fresh?contact.value:methods.value[kind]
   const result=await post(`/auth/${kind}/send`,{[kind]:value,purpose:methods.value.fresh?'bind':'manage',captchaVerifyParam:typeof token==='string'?token:undefined})
   challenge.value=result.challengeId;proof.value=kind;cooldown.value=result.retryAfter;message.value=result.message
   clearInterval(timer);timer=setInterval(()=>{if(--cooldown.value<=0)clearInterval(timer)},1000)
 })
}
async function reauth(){
 await run(async()=>{
   await post('/auth/reauth',channel.value==='password'?{password:password.value}:{channel:channel.value,challengeId:challenge.value,code:code.value})
   password.value='';resetCode();await load();message.value='身份已验证，10 分钟内可管理登录方式。'
 })
}
async function oauth(id,reauth=false){
 await run(async()=>{const result=await post(`/auth/oauth/${id}/link`,{redirect:returnPath.value,reauth});location.assign(result.url)})
}
async function bind(){
 await run(async()=>{await post(`/auth/methods/${contactType.value}`,{[contactType.value]:contact.value,challengeId:challenge.value,code:code.value});resetCode();contact.value='';await load();message.value='绑定成功，账号资料和数据保留在同一个账号中。'})
}
async function savePassword(){
 if(newPassword.value!==confirmPassword.value){error.value='两次输入的密码不一致。';return}
 await run(async()=>{await post('/auth/methods/password',{password:newPassword.value});newPassword.value='';confirmPassword.value='';await load();message.value='密码已更新，其他设备已退出登录。'})
}
async function remove(){
 const target=pendingRemoval.value
 await run(async()=>{await request(`/auth/methods/${target}`,{method:'DELETE'});pendingRemoval.value='';await load();message.value='已解绑，其他设备已退出登录。'})
}
const methodNames={email:'邮箱',phone:'手机号',password:'密码',qq:'QQ',github:'GitHub',google:'Google'}
const codeEnabled=computed(()=>methods.value?.fresh?(contactType.value==='email'?config.value?.emailVerification:config.value?.sms):(channel.value==='email'?config.value?.emailVerification:config.value?.sms))
</script>
<template>
<section class="account-methods" aria-label="账号安全与登录方式">
 <header><div class="account-brand">ONE ACCOUNT</div><h2>账号安全与登录方式</h2><p class="form-hint">绑定后，通过任一已开通的方式登录，均进入此账号。个人资料、贡献值与应用数据共用。</p></header>
 <template v-if="methods">
 <p class="form-hint">账号 ID：{{ methods.userId }}</p>
 <ul class="method-list">
  <li v-for="item in [{id:'email',name:'邮箱',value:methods.email,verified:methods.emailVerified},{id:'phone',name:'手机号',value:methods.phone,verified:methods.phoneVerified},{id:'password',name:'密码',value:methods.password?'已设置':'',verified:true}]" :key="item.id">
   <div><strong>{{ item.name }}</strong><span>{{ item.value || '未绑定' }}<small v-if="item.value && !item.verified"> · 待验证</small></span></div>
   <button v-if="item.value && methods.fresh" type="button" class="account-secondary" :disabled="busy" @click="pendingRemoval=item.id">{{ item.id==='password'?'移除':'解绑' }}</button>
  </li>
  <li v-for="p in providers" :key="p.id">
   <div><strong>{{ p.name }}</strong><span>{{ methods.providers.includes(p.id)?'已绑定':'未绑定' }}{{ p.enabled?'':' · 待开通' }}</span></div>
   <button v-if="methods.fresh" type="button" class="account-secondary" :disabled="busy || (!methods.providers.includes(p.id) && !p.enabled)" @click="methods.providers.includes(p.id)?pendingRemoval=p.id:oauth(p.id)">{{ methods.providers.includes(p.id)?'解绑':'绑定' }}</button>
  </li>
 </ul>
 <div v-if="pendingRemoval" class="method-confirm" role="group" aria-label="确认解绑">
  <p>确认{{ pendingRemoval==='password'?'移除密码':'解绑 '+methodNames[pendingRemoval] }}？解绑后无法再通过它登录。其他设备也会退出，账号数据仍保留。</p>
  <button type="button" class="account-secondary" :disabled="busy" @click="remove">确认解绑</button><button type="button" class="account-secondary" :disabled="busy" @click="pendingRemoval=''">取消</button>
 </div>
 <div v-if="!methods.fresh" class="method-verify">
  <h3>先验证当前账号身份</h3><p class="form-hint">管理登录方式前，请使用当前密码、已验证的联系方式或已绑定的平台确认身份。</p>
  <form v-if="reauthChannels.length" class="auth-form" @submit.prevent="reauth">
   <label>验证方式<select v-model="channel" :disabled="busy"><option v-for="c in reauthChannels" :key="c.id" :value="c.id">{{ c.name }}</option></select></label>
   <label v-if="channel==='password'">当前密码<input v-model="password" type="password" autocomplete="current-password" required maxlength="128"></label>
   <template v-else><p class="form-hint">发送至 {{ methods[channel] }}</p>
    <AliyunCaptcha v-if="config?.captcha" ref="captcha" :config="config.captcha" :disabled="busy || cooldown>0" :label="cooldown?`${cooldown} 秒后重发`:'验证并发送验证码'" @verified="send" />
    <button v-else type="button" class="account-secondary" :disabled="busy || cooldown>0 || !codeEnabled || config?.captchaRequired" @click="send">{{ cooldown?`${cooldown} 秒后重发`:'发送验证码' }}</button>
    <label>验证码<input v-model.trim="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>
   </template>
   <button class="primary-action" :disabled="busy || (channel!=='password' && !challenge)">验证身份</button>
  </form>
  <div class="account-providers"><button v-for="p in providers.filter(p=>methods.providers.includes(p.id) && p.enabled)" :key="p.id" :disabled="busy" @click="oauth(p.id,true)">通过 {{ p.name }} 验证身份</button></div>
 </div>
 <template v-else>
  <h3>绑定或验证联系方式</h3>
  <form class="auth-form" @submit.prevent="bind">
   <label>联系方式<select v-model="contactType" :disabled="busy"><option value="email">邮箱</option><option value="phone">中国大陆手机号</option></select></label>
   <label>{{ contactType==='email'?'邮箱':'手机号' }}<input v-model.trim="contact" :type="contactType==='email'?'email':'tel'" :autocomplete="contactType==='email'?'email':'tel'" :maxlength="contactType==='email'?254:16" required></label>
   <p v-if="!codeEnabled" class="form-hint">{{ contactType==='phone'?'短信服务待开通，暂时无法绑定或验证手机号。':'邮箱验证暂未开通。' }}</p>
   <p v-else class="form-hint">已有联系方式需先解绑才能更换；待验证的邮箱可填写原地址完成验证。</p>
   <AliyunCaptcha v-if="codeEnabled && config?.captcha" ref="captcha" :config="config.captcha" :disabled="busy || cooldown>0 || !contact" :label="cooldown?`${cooldown} 秒后重发`:'验证并发送验证码'" @verified="send" />
   <button v-else type="button" class="account-secondary" :disabled="busy || cooldown>0 || !codeEnabled || !contact || config?.captchaRequired" @click="send">{{ cooldown?`${cooldown} 秒后重发`:'发送验证码' }}</button>
   <label>验证码<input v-model.trim="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>
   <button class="primary-action" :disabled="busy || !challenge || !codeEnabled">确认绑定</button>
  </form>
  <h3>{{ methods.password?'修改密码':'设置密码' }}</h3>
  <form class="auth-form" @submit.prevent="savePassword">
   <p v-if="!methods.email && !methods.phone" class="form-hint">请先绑定邮箱或手机号，以便使用密码登录。</p>
   <label>新密码<input v-model="newPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label>
   <label>确认新密码<input v-model="confirmPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label>
   <button class="primary-action" :disabled="busy || (!methods.email && !methods.phone)">保存密码</button>
  </form>
 </template>
 <p class="form-hint">至少保留一种可用登录方式。已属于其他账号的邮箱、手机号或平台身份不能直接覆盖；请登录原账号操作。修改绑定或密码会退出其他设备。</p>
 </template>
 <p v-else-if="!error" role="status">正在加载登录方式…</p>
 <p v-if="message" role="status" class="account-message">{{ message }}</p><p v-if="error" role="alert" class="form-error">{{ error }}</p>
</section>
</template>
