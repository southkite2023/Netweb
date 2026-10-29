<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { request } from '../lib/api'
import { auth } from '../lib/auth'
import SiteFooter from '../components/SiteFooter.vue'
import SiteNav from '../components/SiteNav.vue'
const route = useRoute(), router = useRouter()
const plans = ref([]), memberships = ref([]), ready = ref(false), busy = ref(false), message = ref(''), loading = ref(true)
let timer, stopped = false
async function refreshMembership() {
  if (auth.user) memberships.value = (await request('/membership/me')).memberships
}
async function checkOrder() {
  if (stopped || !route.query.order || !auth.user) return
  try {
    const order = await request(`/membership/orders/${encodeURIComponent(String(route.query.order))}`)
    if (stopped) return
    if (order.status === 'paid') { message.value = '付款已确认，会员已开通。'; await refreshMembership(); return }
    message.value = '正在等待支付宝确认到账。请勿重复付款；稍后可返回本页查看会员有效期。'
    timer = setTimeout(checkOrder, 8000)
  } catch (error) { if (!stopped) message.value = error.message }
}
async function buy(plan) {
  if (!auth.user) return router.push({ path: '/login', query: { redirect: '/vip' } })
  if (busy.value || !ready.value) return
  busy.value = true; message.value = ''
  try {
    const order = await request('/membership/orders', { method: 'POST', body: JSON.stringify({ planId: plan.id }) })
    const target = new URL(order.payUrl)
    if (target.protocol !== 'https:' || target.hostname !== 'openapi.alipay.com') throw new Error('支付地址异常，请稍后再试。')
    window.location.assign(target.href)
  } catch (error) { message.value = error.message; busy.value = false }
}
onMounted(async () => {
  try {
    const data = await request('/membership/plans'); plans.value = data.plans; ready.value = data.ready
    await refreshMembership(); await checkOrder()
  } catch (error) { message.value = error.message }
  finally { loading.value = false }
})
onUnmounted(() => { stopped = true; clearTimeout(timer) })
</script>
<template>
  <div class="vip-page"><div class="container"><SiteNav />
    <main class="vip-main">
      <header class="vip-hero"><div class="vip-heading"><p class="eyebrow">// MEMBERSHIP · ALIPAY</p><h1>会员与支持</h1></div>
        <div class="vip-intro"><p>选择适合自己的月卡，用支付宝为这里的持续维护与创作提供支持。</p><p>{{ ready ? '支付宝月卡现已开放购买。普通浏览与基础功能继续开放；三档月卡的额外权益尚未确定，请按支持本站的意愿选择。' : '支付宝收款暂未开放，请稍后再来。普通浏览与基础功能继续开放。' }}</p></div>
      </header>
      <section class="monthly-section" aria-labelledby="plans-title"><p class="section-label">01 / MONTHLY PLANS</p><h2 id="plans-title">每一份支持，都有回响。</h2>
        <p class="monthly-note">单次购买一个月，不自动扣款。同档续费从现有到期日顺延；已到期则从付款确认时开始。有效期内暂不支持跨档购买。</p>
        <p v-if="loading" role="status">正在加载套餐…</p>
        <div class="monthly-grid"><article v-for="plan in plans" :key="plan.id" class="monthly-card"><span>月卡 · {{ plan.tier }} 档</span><h3>¥{{ plan.price }}<small> / 月</small></h3><p>有效期一个月<br>额外权益尚未确定</p><button class="btn btn-primary" :disabled="!ready || busy" @click="buy(plan)">{{ ready ? (busy ? '正在创建订单…' : (auth.user ? '支付宝扫码购买' : '登录后购买')) : '暂未开放购买' }}</button></article></div>
        <p class="monthly-note">付款订单将关联当前登录账号。支付宝确认到账后自动开通；页面返回本身不会作为到账凭据。</p>
        <p v-if="message" class="monthly-message" role="status">{{ message }}</p>
      </section>
      <section class="monthly-section"><p class="section-label">02 / MY MEMBERSHIP</p><h2>我的会员</h2>
        <p v-if="!auth.user"><RouterLink to="/login?redirect=/vip">登录</RouterLink>后查看会员状态。</p>
        <p v-else-if="!memberships.length">目前没有生效中的月卡。</p>
        <p v-for="item in memberships" :key="item.planId">{{ item.planId.replace('monthly_', '') }} 元月卡 · 有效至 {{ new Date(item.expiresAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) }}（北京时间）</p>
      </section>
    </main></div><SiteFooter /></div>
</template>
<style scoped>
.monthly-section{padding:48px 0;border-top:1px solid var(--line)}.monthly-section h2{font-size:clamp(26px,4vw,44px);margin:20px 0}.monthly-note,.monthly-card p{color:var(--muted);line-height:1.9;margin:20px 0}.monthly-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:32px 0}.monthly-card{border:1px solid var(--line);border-radius:20px;padding:24px;background:var(--terminal-bg)}.monthly-card>span{color:var(--muted);font-size:13px}.monthly-card h3{font-size:42px;margin:28px 0}.monthly-card small{font-size:14px;font-weight:400}.monthly-card button{width:100%;justify-content:center}.monthly-card button:disabled{opacity:.5;cursor:not-allowed}.monthly-message{padding:20px;border:1px solid var(--accent);border-radius:14px;line-height:1.8}@media(max-width:1000px){.monthly-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.monthly-grid{grid-template-columns:1fr}}
</style>
