<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { request } from '../lib/api'
import { auth } from '../lib/auth'
import SiteFooter from '../components/SiteFooter.vue'
import SiteNav from '../components/SiteNav.vue'
const route = useRoute(), router = useRouter()
const plans = ref([]), memberships = ref([]), ready = ref(false), busy = ref(false), message = ref(''), loading = ref(true)
const paymentState = ref(''), confirmedPlan = ref(''), checking = ref(false), orderId = ref('')
const receipt = ref(null)
const pendingKey = 'yuashie:membership:checkout'
let timer, stopped = false, mounted = false, generation = 0, attempts = 0
const validOrder = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value)
const planName = id => `${plans.value.find(p => p.id === id)?.price ?? id?.replace('monthly_', '')} 元月卡`
const formatDate = value => new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
const confirmedMembership = computed(() => memberships.value.find(item => item.planId === confirmedPlan.value))
const loginTarget = computed(() => ({ path: '/login', query: { redirect: route.fullPath } }))
function storedOrder() {
  try {
    const value = JSON.parse(sessionStorage.getItem(pendingKey) || 'null')
    if (value && String(value.userId) === String(auth.user?.id) && validOrder(value.id) && Date.now() - value.createdAt >= 0 && Date.now() - value.createdAt < 86400000) return value.id
  } catch { /* Storage may be unavailable; the signed-in order URL still works. */ }
  return ''
}
function rememberOrder(id) {
  try { sessionStorage.setItem(pendingKey, JSON.stringify({ id, userId: auth.user.id, createdAt: Date.now() })) } catch { /* Optional recovery only. */ }
}
async function refresh() {
  clearTimeout(timer)
  if (stopped || checking.value || !auth.ready) return
  const run = generation
  if (!auth.user) { loading.value = false; return }
  checking.value = true
  try {
    const explicitOrder = typeof route.query.order === 'string' ? route.query.order : ''
    orderId.value = validOrder(explicitOrder) ? explicitOrder : storedOrder()
    if (explicitOrder && !validOrder(explicitOrder)) { paymentState.value = 'error'; message.value = '订单链接无效，请查看下方会员状态。' }
    if (orderId.value) {
      if (paymentState.value !== 'paid') paymentState.value = 'checking'
      const order = await request(`/membership/orders/${encodeURIComponent(orderId.value)}`)
      if (stopped || run !== generation) return
      confirmedPlan.value = order.planId
      paymentState.value = order.status === 'paid' ? 'paid' : 'pending'
      if (order.status === 'paid') rememberOrder(order.id)
      message.value = ''
    }
    const data = await request('/membership/me')
    if (stopped || run !== generation) return
    memberships.value = data.memberships
    if (paymentState.value === 'paid') receipt.value?.focus({ preventScroll: false })
  } catch (error) {
    if (stopped || run !== generation) return
    if (paymentState.value !== 'paid') paymentState.value = orderId.value ? 'error' : ''
    message.value = error.message
  } finally {
    if (run === generation) {
      checking.value = false; loading.value = false
      if (!stopped && orderId.value && paymentState.value !== 'paid' && ++attempts < 38) timer = setTimeout(refresh, 8000)
    }
  }
}
function resume() {
  if (document.visibilityState === 'visible') { attempts = 0; void refresh() }
}
async function buy(plan) {
  if (!auth.user) return router.push(loginTarget.value)
  if (busy.value || !ready.value) return
  busy.value = true; message.value = ''
  try {
    const order = await request('/membership/orders', { method: 'POST', body: JSON.stringify({ planId: plan.id }) })
    const target = new URL(order.payUrl)
    if (target.protocol !== 'https:' || target.hostname !== 'openapi.alipay.com') throw new Error('支付地址异常，请稍后再试。')
    rememberOrder(order.id)
    window.location.assign(target.href)
  } catch (error) { message.value = error.message; busy.value = false }
}
watch([() => auth.ready, () => auth.user?.id, () => route.query.order], () => {
  if (!mounted) return
  generation++; checking.value = false; attempts = 0; paymentState.value = ''; confirmedPlan.value = ''; memberships.value = []; orderId.value = ''; message.value = ''
  void refresh()
})
onMounted(async () => {
  mounted = true
  window.addEventListener('focus', resume); window.addEventListener('pageshow', resume); document.addEventListener('visibilitychange', resume)
  try { const data = await request('/membership/plans'); plans.value = data.plans; ready.value = data.ready }
  catch (error) { message.value = error.message }
  finally { await refresh(); loading.value = false }
})
onUnmounted(() => {
  stopped = true; generation++; clearTimeout(timer)
  window.removeEventListener('focus', resume); window.removeEventListener('pageshow', resume); document.removeEventListener('visibilitychange', resume)
})
</script>
<template>
  <div class="vip-page"><div class="container"><SiteNav />
    <main class="vip-main">
      <section v-if="paymentState" ref="receipt" tabindex="-1" class="payment-receipt" :class="{ 'payment-receipt-success': paymentState === 'paid' }" role="status" aria-live="polite" aria-atomic="true">
        <span class="receipt-icon" aria-hidden="true">{{ paymentState === 'paid' ? '✓' : '◷' }}</span>
        <div class="receipt-copy">
          <p class="eyebrow">{{ paymentState === 'paid' ? 'PAYMENT RECEIVED · MEMBERSHIP ACTIVE' : 'PAYMENT STATUS' }}</p>
          <h1>{{ paymentState === 'paid' ? '支付成功，会员已生效' : paymentState === 'error' ? '暂时未能确认付款结果' : '正在确认支付宝到账' }}</h1>
          <template v-if="paymentState === 'paid'">
            <p>{{ planName(confirmedPlan) }}已到账，会员已自动开通或续期。谢谢你的支持。</p>
            <p v-if="confirmedMembership" class="receipt-expiry">有效至 {{ formatDate(confirmedMembership.expiresAt) }} <small>北京时间</small></p>
            <p v-else>正在同步会员有效期，请稍后刷新状态。</p>
          </template>
          <template v-else><p>如果已经付款，请勿重复支付。到账确认后，这里会自动更新。</p><p v-if="message">{{ message }}</p></template>
          <button class="btn" :disabled="checking" @click="refresh">{{ checking ? '正在更新…' : paymentState === 'paid' ? '刷新会员状态' : '我已支付，刷新结果' }}</button>
          <a v-if="paymentState === 'paid'" class="receipt-profile" :href="`/u/${encodeURIComponent(auth.user?.username || '')}`">查看我的账户 ↗</a>
        </div>
      </section>
      <section v-else-if="memberships.length" class="membership-summary" aria-label="当前会员状态">
        <span class="receipt-icon" aria-hidden="true">✓</span><div><p class="eyebrow">MEMBERSHIP ACTIVE</p><h2>你的会员已生效</h2><p v-for="item in memberships" :key="item.planId">{{ planName(item.planId) }} · 有效至 {{ formatDate(item.expiresAt) }}（北京时间）</p></div>
      </section>
      <header class="vip-hero"><div class="vip-heading"><p class="eyebrow">// MEMBERSHIP · ALIPAY</p><h1>会员与支持</h1></div>
        <div class="vip-intro"><p>选择适合自己的月卡，用支付宝为这里的持续维护与创作提供支持。</p><p>{{ ready ? '支付宝月卡现已开放购买。普通浏览与基础功能继续开放；三档月卡的额外权益尚未确定，请按支持本站的意愿选择。' : '支付宝收款暂未开放，请稍后再来。普通浏览与基础功能继续开放。' }}</p></div>
      </header>
      <section class="monthly-section" aria-labelledby="plans-title"><p class="section-label">01 / MONTHLY PLANS</p><h2 id="plans-title">每一份支持，都有回响。</h2>
        <p class="monthly-note">单次购买一个月，不自动扣款。同档续费从现有到期日顺延；已到期则从付款确认时开始。有效期内暂不支持跨档购买。</p>
        <p v-if="loading" role="status">正在加载套餐…</p>
        <div class="monthly-grid"><article v-for="plan in plans" :key="plan.id" class="monthly-card" :class="{ 'monthly-card-active': memberships.some(item => item.planId === plan.id) }"><span>月卡 · {{ plan.tier }} 档 <strong v-if="memberships.some(item => item.planId === plan.id)" class="active-label">使用中</strong></span><h3>¥{{ plan.price }}<small> / 月</small></h3><p>有效期一个月<br>额外权益尚未确定</p><button class="btn btn-primary" :disabled="!ready || busy" @click="buy(plan)">{{ ready ? (busy ? '正在创建订单…' : !auth.user ? '登录后购买' : memberships.some(item => item.planId === plan.id) ? '续费一个月' : '支付宝扫码购买') : '暂未开放购买' }}</button></article></div>
        <p class="monthly-note">付款订单将关联当前登录账号。支付后返回本页，系统会自动更新到账结果和会员有效期。</p>
        <p v-if="message && (!paymentState || paymentState === 'paid')" class="monthly-message" role="status">{{ message }}</p>
      </section>
      <section class="monthly-section"><p class="section-label">02 / MY MEMBERSHIP</p><h2>我的会员</h2>
        <p v-if="!auth.user"><RouterLink :to="loginTarget">登录</RouterLink>后查看会员状态及付款结果。</p>
        <p v-else-if="!memberships.length">{{ loading ? '正在同步会员状态…' : '目前没有生效中的月卡。' }}</p>
        <div v-for="item in memberships" :key="item.planId" class="member-detail"><span class="active-label">已生效</span><h3>{{ planName(item.planId) }}</h3><p>有效至 {{ formatDate(item.expiresAt) }}（北京时间）</p></div>
        <button v-if="auth.user" class="btn" :disabled="checking" @click="refresh">{{ checking ? '正在更新…' : '刷新会员状态' }}</button>
      </section>
    </main></div><SiteFooter /></div>
</template>
<style scoped>
.monthly-section{padding:48px 0;border-top:1px solid var(--line)}.monthly-section h2{font-size:clamp(26px,4vw,44px);margin:20px 0}.monthly-note,.monthly-card p{color:var(--muted);line-height:1.9;margin:20px 0}.monthly-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:32px 0}.monthly-card{border:1px solid var(--line);border-radius:20px;padding:24px;background:var(--terminal-bg)}.monthly-card>span{color:var(--muted);font-size:13px}.monthly-card h3{font-size:42px;margin:28px 0}.monthly-card small{font-size:14px;font-weight:400}.monthly-card button{width:100%;justify-content:center}.monthly-card button:disabled{opacity:.5;cursor:not-allowed}.monthly-message{padding:20px;border:1px solid var(--accent);border-radius:14px;line-height:1.8}
.payment-receipt,.membership-summary{display:flex;gap:24px;align-items:flex-start;padding:32px;border:1px solid var(--line);border-radius:24px;background:var(--terminal-bg);margin-bottom:32px;scroll-margin-top:100px}.payment-receipt-success,.membership-summary{border-color:var(--green);background:linear-gradient(120deg,rgba(100,220,160,.09),transparent),var(--terminal-bg)}.receipt-icon{display:grid;place-items:center;flex-shrink:0;width:52px;height:52px;border:1px solid currentColor;border-radius:50%;font-size:26px;color:var(--accent)}.payment-receipt-success .receipt-icon,.membership-summary .receipt-icon{color:var(--green)}.receipt-copy{min-width:0}.receipt-copy h1{font-size:clamp(24px,3.5vw,40px);line-height:1.3;margin:12px 0}.receipt-copy p,.membership-summary p{line-height:1.8;overflow-wrap:anywhere}.receipt-copy .btn{margin-top:20px}.receipt-expiry{font-weight:600}.receipt-expiry small{font-weight:400;color:var(--muted)}.receipt-profile{display:inline-block;margin:16px 0 0 20px;color:var(--accent)}.membership-summary h2{font-size:28px;margin:12px 0}.monthly-card-active{border-color:var(--green)}.active-label{display:inline-block;font-size:12px;font-weight:500;line-height:1.6;color:var(--green);border:1px solid currentColor;border-radius:20px;padding:2px 10px;margin-left:8px}.member-detail{padding:24px;border:1px solid var(--line);border-radius:16px;margin:20px 0}.member-detail .active-label{margin:0}.member-detail h3{margin:16px 0}.member-detail p{color:var(--muted);line-height:1.8}@media(max-width:1000px){.monthly-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.monthly-grid{grid-template-columns:1fr}.payment-receipt,.membership-summary{padding:22px;gap:14px}.receipt-icon{width:34px;height:34px;font-size:20px}.receipt-profile{display:block;margin-left:0}.membership-summary h2{font-size:24px}}
</style>
