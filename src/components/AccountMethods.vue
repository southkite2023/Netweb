<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { request } from '../lib/api'
import AliyunCaptcha from './AliyunCaptcha.vue'

const router = useRouter()
const route = useRoute()
const config = ref(null)
const methods = ref(null)
const busy = ref(false)
const error = ref('')
const message = ref('')
const selected = ref('')
const step = ref('')
const operation = ref('')
const dialog = ref(null)
const password = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const channel = ref('password')
const challenge = ref('')
const code = ref('')
const contact = ref('')
const cooldown = ref(0)
const captcha = ref(null)
let timer

const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) })
const providerList = computed(() => config.value?.providers || [])
const provider = id => providerList.value.find(p => p.id === id)
const isContact = id => id === 'email' || id === 'phone'
const methodNames = { email: '邮箱', phone: '手机号', password: '密码', qq: 'QQ', github: 'GitHub', google: 'Google' }
const methodCards = computed(() => {
  if (!methods.value) return []
  const m = methods.value
  return [
    { id: 'email', name: '邮箱', value: m.email || '', bound: !!m.email, verified: !!m.emailVerified },
    { id: 'phone', name: '手机号', value: m.phone || '', bound: !!m.phone, verified: !!m.phoneVerified },
    { id: 'password', name: '密码', value: m.password ? '已设置' : '未设置', bound: !!m.password, verified: true },
    ...providerList.value.map(p => ({ id: p.id, name: p.name, value: m.providers.includes(p.id) ? '已绑定' : '未绑定', bound: m.providers.includes(p.id), verified: true, enabled: !!p.enabled })),
  ]
})
const activeCard = computed(() => methodCards.value.find(item => item.id === selected.value))
const bindingEnabled = computed(() => selected.value === 'email' ? !!config.value?.emailVerification : selected.value === 'phone' ? !!config.value?.sms : !!provider(selected.value)?.enabled)
const reauthChannels = computed(() => [
  ...(methods.value?.password ? [{ id: 'password', name: '当前密码' }] : []),
  ...(methods.value?.emailVerified && config.value?.emailVerification ? [{ id: 'email', name: '已验证邮箱' }] : []),
  ...(methods.value?.phoneVerified && config.value?.sms ? [{ id: 'phone', name: '已验证手机号' }] : []),
])
const returnPath = computed(() => route.path.startsWith('/u/') ? route.path : route.path.startsWith('/settings') ? route.path : '/auth/security')
const codeEnabled = computed(() => step.value === 'verify'
  ? (channel.value === 'email' ? config.value?.emailVerification : config.value?.sms)
  : (selected.value === 'email' ? config.value?.emailVerification : config.value?.sms))

async function load() {
  const [c, m] = await Promise.all([request('/auth/config'), request('/auth/methods')])
  config.value = c
  methods.value = m
  if (!reauthChannels.value.some(item => item.id === channel.value)) channel.value = reauthChannels.value[0]?.id || ''
}
onMounted(async () => {
  try { await load() }
  catch (e) {
    error.value = e.message
    if (e.status === 401) router.replace({ path: '/login', query: { redirect: route.fullPath } })
  }
})
onBeforeUnmount(() => clearInterval(timer))
watch(selected, async value => {
  await nextTick()
  if (value && dialog.value && !dialog.value.open) dialog.value.showModal()
})
function resetCode() { challenge.value = ''; code.value = '' }
watch([channel, contact], resetCode)
function closeModal(force = false) {
  if (busy.value && force !== true) return
  if (dialog.value?.open) dialog.value.close()
  selected.value = ''
  step.value = ''
  operation.value = ''
  password.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  contact.value = ''
  resetCode()
  error.value = ''
}
function openMethod(id) {
  if (busy.value) return
  error.value = ''
  message.value = ''
  password.value = ''
  contact.value = ''
  resetCode()
  operation.value = ''
  selected.value = id
  step.value = 'choose'
}
async function run(fn) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  message.value = ''
  try { await fn() }
  catch (e) {
    error.value = e.message
    if (e.status === 403 && methods.value) methods.value.fresh = false
  } finally {
    busy.value = false
    captcha.value?.reset()
  }
}
function chooseAction(action) {
  if (busy.value || !activeCard.value) return
  if (action === 'bind' && !bindingEnabled.value) return
  operation.value = action
  error.value = ''
  password.value = ''
  resetCode()
  contact.value = action === 'verify' ? (methods.value?.email || '') : ''
  channel.value = reauthChannels.value[0]?.id || ''
  // An OAuth-only account may have just completed provider reauthentication.
  if (!reauthChannels.value.length && methods.value?.fresh) { proceedAfterVerification(); return }
  step.value = 'verify'
}
async function proceedAfterVerification() {
  if (operation.value === 'remove' || operation.value === 'replace') {
    step.value = 'confirm'
  } else if (provider(selected.value)) {
    await oauth(selected.value)
  } else {
    step.value = 'edit'
  }
}
async function send(token) {
  if (cooldown.value || busy.value) return
  await run(async () => {
    const verifyingIdentity = step.value === 'verify'
    const kind = verifyingIdentity ? channel.value : selected.value
    const value = verifyingIdentity ? methods.value[kind] : (operation.value === 'verify' ? methods.value[kind] : contact.value)
    const purpose = verifyingIdentity ? 'manage' : (operation.value === 'verify' ? 'verify' : 'bind')
    const result = await post('/auth/' + kind + '/send', {
      [kind]: value, purpose, captchaVerifyParam: typeof token === 'string' ? token : undefined,
    })
    challenge.value = result.challengeId
    cooldown.value = result.retryAfter || 60
    message.value = result.message
    clearInterval(timer)
    timer = setInterval(() => { if (--cooldown.value <= 0) clearInterval(timer) }, 1000)
  })
}
async function reauth() {
  await run(async () => {
    await post('/auth/reauth', channel.value === 'password'
      ? { password: password.value }
      : { channel: channel.value, challengeId: challenge.value, code: code.value })
    password.value = ''
    resetCode()
    await load()
    await proceedAfterVerification()
  })
}
async function oauth(id, reauthOnly = false) {
  const result = await post('/auth/oauth/' + id + '/link', { redirect: returnPath.value, reauth: reauthOnly })
  location.assign(result.url)
}
function oauthReauth(id) {
  run(() => oauth(id, true))
}
async function bindContact() {
  if (!isContact(selected.value)) return
  await run(async () => {
    if (operation.value === 'verify') {
      await post('/auth/email/verify', { challengeId: challenge.value, code: code.value })
    } else {
      await post('/auth/methods/' + selected.value, {
        [selected.value]: contact.value, challengeId: challenge.value, code: code.value,
      })
    }
    const success = operation.value === 'verify' ? '邮箱验证成功。' : (operation.value === 'replace' ? '换绑成功，账号数据保持不变。' : '绑定成功，账号数据保持不变。')
    await load()
    closeModal(true)
    message.value = success
  })
}
async function savePassword() {
  if (newPassword.value !== confirmPassword.value) { error.value = '两次输入的密码不一致。'; return }
  await run(async () => {
    await post('/auth/methods/password', { password: newPassword.value })
    await load()
    closeModal(true)
    message.value = '密码已更新，其他设备已退出登录。'
  })
}
async function remove() {
  const id = selected.value
  await run(async () => {
    await request('/auth/methods/' + id, { method: 'DELETE' })
    await load()
    if (operation.value === 'replace') {
      resetCode()
      if (isContact(id)) step.value = 'edit'
      else if (provider(id)?.enabled) await oauth(id)
      else { closeModal(true); message.value = '已解绑。当前平台登录尚未开通，暂不能重新绑定。' }
    } else {
      closeModal(true)
      message.value = '已解绑，其他设备已退出登录。'
    }
  })
}
</script>

<template>
<section class="account-methods" aria-label="账号安全与登录方式">
  <header class="method-heading">
    <div class="account-brand">ONE ACCOUNT</div>
    <h2>账号安全与登录方式</h2>
    <p class="form-hint">绑定任一已开通的登录方式，即可访问同一账号下的个人资料、贡献值与应用数据。</p>
  </header>
  <template v-if="methods">
    <p class="method-account-id">账号 ID：{{ methods.userId }}</p>
    <ul class="method-list" aria-label="登录方式">
      <li v-for="item in methodCards" :key="item.id">
        <button type="button" class="method-tile" :disabled="busy" :aria-label="'管理' + item.name" @click="openMethod(item.id)">
          <span class="method-tile-top">
            <strong>{{ item.name }}</strong>
            <span class="method-tile-arrow" aria-hidden="true">↗</span>
          </span>
          <span class="method-tile-value">{{ item.value || '未绑定' }}</span>
          <span class="method-tile-meta">
            {{ item.bound ? (item.verified ? '已绑定' : '待验证') : '未绑定' }}{{ item.enabled === false ? ' · 待开通' : '' }}
          </span>
        </button>
      </li>
    </ul>
    <p class="method-footnote">修改登录方式需要验证当前身份。至少保留一种可用的登录方式，已属于其他账号的身份不能直接覆盖。</p>

    <dialog v-if="selected" ref="dialog" class="account-method-dialog" aria-labelledby="account-method-dialog-title" @cancel.prevent="closeModal" @close="closeModal">
      <div class="method-dialog-head">
        <div>
          <small>ACCOUNT SECURITY</small>
          <h3 id="account-method-dialog-title">{{ activeCard?.name }} · {{ step === 'verify' ? '验证身份' : step === 'choose' ? '选择操作' : step === 'confirm' ? '确认操作' : '完成操作' }}</h3>
        </div>
        <button type="button" class="method-dialog-close" :disabled="busy" aria-label="关闭窗口" @click="closeModal">×</button>
      </div>

      <div v-if="step === 'choose'" class="method-dialog-options">
        <p class="form-hint">当前状态：{{ activeCard?.value || '未绑定' }}{{ activeCard?.enabled === false ? ' · 此平台暂未开通' : '' }}</p>
        <template v-if="selected === 'password'">
          <button type="button" class="method-option" @click="chooseAction('change')">{{ activeCard?.bound ? '修改密码' : '设置密码' }}<span>›</span></button>
          <button v-if="activeCard?.bound" type="button" class="method-option" @click="chooseAction('remove')">移除密码<span>›</span></button>
        </template>
        <template v-else>
          <button v-if="!activeCard?.bound && bindingEnabled" type="button" class="method-option" @click="chooseAction('bind')">新增绑定<span>›</span></button>
          <button v-if="activeCard?.bound && isContact(selected) && !activeCard?.verified && config?.emailVerification" type="button" class="method-option" @click="chooseAction('verify')">验证当前邮箱<span>›</span></button>
          <button v-if="activeCard?.bound && bindingEnabled" type="button" class="method-option" @click="chooseAction('replace')">更换绑定<span>›</span></button>
          <button v-if="activeCard?.bound" type="button" class="method-option" @click="chooseAction('remove')">解除绑定<span>›</span></button>
        </template>
        <p v-if="activeCard?.enabled === false" class="form-hint">此平台的授权登录尚未开通，暂不能新增或换绑；已绑定身份仍可选择解绑。</p>
        <p v-if="selected === 'phone' && !config?.sms" class="form-hint">短信服务尚未开通，暂不能完成手机号新增或换绑。</p>
        <p v-if="selected === 'email' && !config?.emailVerification" class="form-hint">邮箱验证服务尚未开通，暂不能完成邮箱新增或换绑。</p>
        <button type="button" class="account-secondary method-cancel" @click="closeModal">取消</button>
      </div>

      <div v-else-if="step === 'verify'" class="method-dialog-content">
        <p class="form-hint">开始{{ operation === 'remove' ? '解绑' : operation === 'replace' ? '换绑' : operation === 'verify' ? '验证' : '绑定或修改' }}前，请先证明这是你的账号。</p>
        <form v-if="reauthChannels.length" class="auth-form" @submit.prevent="reauth">
          <label>验证方式
            <select v-model="channel" :disabled="busy"><option v-for="item in reauthChannels" :key="item.id" :value="item.id">{{ item.name }}</option></select>
          </label>
          <label v-if="channel === 'password'">当前密码
            <input v-model="password" type="password" autocomplete="current-password" maxlength="128" required autofocus>
          </label>
          <template v-else>
            <p class="form-hint">验证码发送至 {{ methods[channel] }}</p>
            <AliyunCaptcha v-if="config?.captcha" ref="captcha" :config="config.captcha" :disabled="busy || cooldown > 0" :label="cooldown ? cooldown + ' 秒后重发' : '验证并发送验证码'" @verified="send" />
            <button v-else type="button" class="account-secondary" :disabled="busy || cooldown > 0 || !codeEnabled || config?.captchaRequired" @click="send">{{ cooldown ? cooldown + ' 秒后重发' : '发送验证码' }}</button>
            <label>验证码<input v-model.trim="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>
          </template>
          <button class="primary-action" :disabled="busy || (channel !== 'password' && !challenge)">{{ busy ? '验证中…' : '验证并继续' }}</button>
        </form>
        <div v-if="providerList.some(p => p.enabled && methods.providers.includes(p.id))" class="method-oauth-verify">
          <p class="form-hint">也可以通过已绑定的平台验证：</p>
          <button v-for="p in providerList.filter(p => p.enabled && methods.providers.includes(p.id))" :key="p.id" type="button" class="account-secondary" :disabled="busy" @click="oauthReauth(p.id)">{{ p.name }} 身份验证</button>
        </div>
        <p v-if="!reauthChannels.length && !providerList.some(p => p.enabled && methods.providers.includes(p.id))" class="form-hint">当前没有可用的身份验证渠道，请联系网站管理员。</p>
      </div>

      <div v-else-if="step === 'confirm'" class="method-dialog-content">
        <p>{{ operation === 'replace' ? '当前服务需要先解绑旧' + methodNames[selected] + '，再绑定新的身份。' : '确认解绑' + methodNames[selected] + '？' }}</p>
        <p class="form-hint">解绑后原方式将立即无法用于登录，其他设备也会退出登录。必须保留至少一种其他可用登录方式，当前账号及数据不会删除。</p>
        <div class="method-dialog-actions">
          <button type="button" class="account-secondary" :disabled="busy" @click="step='choose'">返回</button>
          <button type="button" class="primary-action" :disabled="busy" @click="remove">{{ busy ? '处理中…' : operation === 'replace' ? '确认解绑并继续换绑' : '确认解绑' }}</button>
        </div>
      </div>

      <div v-else-if="step === 'edit'" class="method-dialog-content">
        <form v-if="isContact(selected)" class="auth-form" @submit.prevent="bindContact">
          <p v-if="operation === 'replace'" class="form-hint">旧{{ methodNames[selected] }}已解绑，请完成新{{ methodNames[selected] }}验证。未完成前请保留其他登录方式。</p>
          <label>{{ methodNames[selected] }}
            <input v-model.trim="contact" :type="selected === 'email' ? 'email' : 'tel'" :autocomplete="selected === 'email' ? 'email' : 'tel'" :maxlength="selected === 'email' ? 254 : 16" :readonly="operation === 'verify'" required>
          </label>
          <p v-if="!codeEnabled" class="form-hint">{{ selected === 'email' ? '邮箱验证尚未开通。' : '短信服务尚未开通。' }}</p>
          <AliyunCaptcha v-if="codeEnabled && config?.captcha" ref="captcha" :config="config.captcha" :disabled="busy || cooldown > 0 || !contact" :label="cooldown ? cooldown + ' 秒后重发' : '验证并发送验证码'" @verified="send" />
          <button v-else type="button" class="account-secondary" :disabled="busy || cooldown > 0 || !codeEnabled || !contact || config?.captchaRequired" @click="send">{{ cooldown ? cooldown + ' 秒后重发' : '发送验证码' }}</button>
          <label>验证码<input v-model.trim="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>
          <button class="primary-action" :disabled="busy || !challenge || !codeEnabled">{{ operation === 'verify' ? '确认验证' : operation === 'replace' ? '完成换绑' : '确认绑定' }}</button>
        </form>
        <form v-else-if="selected === 'password'" class="auth-form" @submit.prevent="savePassword">
          <p v-if="!methods.email && !methods.phone" class="form-hint">请先绑定邮箱或手机号，以便使用密码登录。</p>
          <label>新密码<input v-model="newPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label>
          <label>确认新密码<input v-model="confirmPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label>
          <button class="primary-action" :disabled="busy || (!methods.email && !methods.phone)">{{ busy ? '保存中…' : '保存密码' }}</button>
        </form>
      </div>
      <p v-if="message" role="status" class="account-message">{{ message }}</p>
      <p v-if="error" role="alert" class="form-error">{{ error }}</p>
    </dialog>
  </template>
  <p v-else-if="!error" role="status">正在加载登录方式…</p>
  <p v-if="!selected && message" role="status" class="account-message">{{ message }}</p>
  <p v-if="!selected && error" role="alert" class="form-error">{{ error }}</p>
</section>
</template>
