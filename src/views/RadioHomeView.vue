<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import RadioSubnav from '../components/RadioSubnav.vue'
import { radioHomeCopy } from '../data/radioHome'
import { api } from '../lib/api'
import { auth } from '../lib/auth'
import '../radio-home.css'

const { locale } = useI18n()
const c = computed(() => radioHomeCopy[locale.value] || radioHomeCopy.zh)
const data = ref(null)
const error = ref('')
const loading = ref(true)
const profile = computed(() => data.value?.profile)
const login = { path: '/login', query: { redirect: '/003/radio' } }
const primary = computed(() => !auth.user ? login : profile.value ? '/003/radio/log/new' : '/003/radio/station')
const primaryLabel = computed(() => !auth.user ? c.value.login : profile.value ? c.value.add : c.value.bind)
const destinations = ['/003/radio/log', '/003/radio/qsl', '/003/radio/station']
const stats = computed(() => data.value?.stats ? [data.value.stats.qsoCount, data.value.stats.qslSentCount, data.value.stats.qslReceivedCount, data.value.stats.unreadQslCount] : [])
let requestId = 0
async function load() {
  const id = ++requestId
  data.value = null; error.value = ''; loading.value = true
  if (!auth.ready) return
  if (!auth.user) { loading.value = false; return }
  try {
    const result = await api.radioDashboard()
    if (id === requestId) data.value = result
  } catch (e) { if (id === requestId) error.value = e.message }
  finally { if (id === requestId) loading.value = false }
}
watch(() => [auth.ready, auth.user?.id], load, { immediate: true })
</script>

<template>
  <div class="radio-page radio-home-page">
    <div class="container">
      <SiteNav />
      <RadioSubnav />
      <main class="radio-home-main">
        <div class="rh-breadcrumb"><RouterLink to="/projects/003">← {{ c.back }}</RouterLink><span>YUASHIE / RADIO</span></div>
        <div class="rh-layout">
          <div class="rh-content">
            <header class="rh-hero">
              <p class="rh-eyebrow">PROJECT 003 / AMATEUR RADIO</p>
              <p class="rh-wordmark">Yuashie Radio<span aria-hidden="true">003</span></p>
              <h1>{{ c.title[0] }}<br><span>{{ c.title[1] }}</span></h1>
              <p class="rh-intro">{{ c.intro }}</p>
              <div class="rh-actions"><RouterLink class="btn btn-primary" :to="primary">{{ primaryLabel }} <span aria-hidden="true">↗</span></RouterLink><RouterLink class="btn btn-secondary" to="/003/lab">{{ c.lab }} <span aria-hidden="true">→</span></RouterLink></div>
              <div class="rh-wave" aria-hidden="true"><i v-for="n in 49" :key="n" :style="{ height: `${12 + ((n * 17) % 39)}px` }"></i><span>CQ · CQ · 73</span></div>
            </header>

            <section class="rh-workspace" :aria-busy="loading" aria-labelledby="radio-overview">
              <div class="rh-section-head"><div><p class="rh-eyebrow">01 / LOGBOOK</p><h2 id="radio-overview">{{ profile ? c.workspace : c.overview }}</h2></div><RouterLink v-if="profile" to="/003/radio/log">{{ c.all }} ↗</RouterLink></div>
              <p v-if="loading" class="rh-state" role="status">{{ c.loading }}</p>
              <div v-else-if="error" class="rh-state" role="alert"><h3>{{ c.failed }}</h3><p>{{ error }}</p><button class="btn btn-secondary" type="button" @click="load">{{ c.retry }} ↻</button></div>
              <div v-else-if="!profile" class="rh-state rh-onboard"><span class="rh-morse" aria-hidden="true">−·−· −−·−</span><h3>{{ auth.user ? c.unbound : c.guest }}</h3><p>{{ auth.user ? c.unboundText : c.guestText }}</p><RouterLink class="inline-link" :to="primary">{{ primaryLabel }} →</RouterLink></div>
              <template v-else>
                <dl class="rh-stats"><div v-for="(value, i) in stats" :key="i"><dt>{{ c.stats[i] }}</dt><dd>{{ value }}</dd></div></dl>
                <h3 class="rh-recent-title">{{ c.recent }}</h3>
                <div v-if="data.recentQsos?.length" class="radio-table-wrap" tabindex="0" :aria-label="c.recent">
                  <table class="radio-table rh-table"><thead><tr><th scope="col">{{ c.date }}</th><th scope="col">{{ c.remote }}</th><th scope="col">{{ c.freq }}</th><th scope="col">{{ c.mode }}</th></tr></thead><tbody><tr v-for="item in data.recentQsos" :key="item.id"><td>{{ item.date }} <span>{{ item.time.slice(0, 5) }}</span></td><td><RouterLink :to="`/003/radio/log/${item.id}/edit`">{{ item.remoteCallsign }}</RouterLink></td><td>{{ item.frequencyMHz.toFixed(3) }} MHz</td><td>{{ item.mode }}</td></tr></tbody></table>
                </div>
                <div v-else class="rh-state"><h3>{{ c.noQso }}</h3><p>{{ c.emptyText }}</p><RouterLink class="inline-link" to="/003/radio/log/new">{{ c.add }} →</RouterLink></div>
              </template>
            </section>
          </div>

          <aside class="rh-sidebar">
            <section class="rh-identity"><p class="rh-eyebrow">{{ c.identity }} / ID</p><div class="rh-identity-art" aria-hidden="true"><span>003</span><svg viewBox="0 0 220 100" fill="none"><path d="M110 90V45M90 90h40M102 45h16M82 29a40 40 0 0 0 0 45m56-45a40 40 0 0 1 0 45M65 13a63 63 0 0 0 0 77m90-77a63 63 0 0 1 0 77" stroke="currentColor" stroke-width="2"/><circle cx="110" cy="35" r="7" stroke="currentColor" stroke-width="2"/></svg></div>
              <template v-if="profile"><h2>{{ profile.callsign }}</h2><dl><div><dt>{{ c.cls }}</dt><dd>{{ profile.operatorClass }}</dd></div><div><dt>QTH</dt><dd>{{ profile.qth || c.noQth }}</dd></div></dl><RouterLink class="inline-link" :to="{ name: 'radio-station', params: { callsign: profile.callsign } }">{{ c.public }} ↗</RouterLink></template>
              <template v-else><h2>Yuashie Radio</h2><p>{{ loading ? c.loading : error ? c.failed : auth.user ? c.unboundText : c.guestText }}</p><RouterLink v-if="!loading && !error" class="inline-link" :to="primary">{{ primaryLabel }} →</RouterLink></template>
            </section>
            <RouterLink class="rh-lab-card" to="/003/lab"><span class="rh-eyebrow">SIGNAL LAB / CW</span><span class="rh-lab-code" aria-hidden="true">··· −−− ···</span><h2>{{ c.lab }}</h2><p>{{ c.labText }}</p><span class="inline-link">{{ c.labAction }} ↗</span></RouterLink>
          </aside>
        </div>
        <section class="rh-tools" aria-labelledby="radio-tools"><div class="rh-section-head"><div><p class="rh-eyebrow">02 / TOOLKIT</p><h2 id="radio-tools">{{ c.tools }}</h2></div></div><div class="rh-tool-grid"><RouterLink v-for="(card, i) in c.cards" :key="i" :to="destinations[i]"><span class="rh-tool-index">0{{ i + 1 }} <span aria-hidden="true">↗</span></span><h3>{{ card[0] }}</h3><p>{{ card[1] }}</p></RouterLink></div><p class="rh-note">{{ c.note }}</p></section>
      </main>
    </div>
    <SiteFooter />
  </div>
</template>
