<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import RadioSubnav from '../components/RadioSubnav.vue'
import { api } from '../lib/api'
import { auth } from '../lib/auth'

const { locale } = useI18n()
const data = ref(null)
const error = ref('')
const loading = ref(true)
const copy = computed(() => ({
  zh: { kicker: '// PROJECT 003 · AMATEUR RADIO', title: 'Yuashie Radio', intro: '记录每一次 QSO，维护你的电台身份，并与本站其他无线电爱好者交换电子 QSL。', bind: '绑定我的呼号', login: '登录后进入电台系统', qso: 'QSO 总数', sent: 'QSL 已发', received: 'QSL 已收', unread: '未读 QSL', recent: '最近通联', noQso: '还没有通联记录。', add: '记录一次 QSO', qsl: '打开 QSL 收件箱', station: '电台资料', time: '时间（BJT）', freq: '频率', mode: '模式', remote: '对方呼号' },
  en: { kicker: '// PROJECT 003 · AMATEUR RADIO', title: 'Yuashie Radio', intro: 'Log every QSO, maintain your station identity, and exchange electronic QSL cards with other operators on Yuashie.', bind: 'Bind my callsign', login: 'Sign in to enter Yuashie Radio', qso: 'TOTAL QSO', sent: 'QSL SENT', received: 'QSL RECEIVED', unread: 'UNREAD QSL', recent: 'RECENT QSO', noQso: 'No QSO records yet.', add: 'LOG A QSO', qsl: 'OPEN QSL INBOX', station: 'STATION PROFILE', time: 'TIME (BJT)', freq: 'FREQ', mode: 'MODE', remote: 'REMOTE CALL' },
  ja: { kicker: '// PROJECT 003 · AMATEUR RADIO', title: 'Yuashie Radio', intro: 'QSOを記録し、無線局プロフィールを管理し、Yuashieの他の無線家と電子QSLを交換できます。', bind: 'コールサインを登録', login: 'ログインして無線システムへ', qso: 'QSO 合計', sent: 'QSL 送信', received: 'QSL 受信', unread: '未読 QSL', recent: '最近のQSO', noQso: 'QSO記録はまだありません。', add: 'QSOを記録', qsl: 'QSL受信箱', station: '無線局プロフィール', time: '時刻（BJT）', freq: '周波数', mode: 'モード', remote: '相手局' },
}[locale.value]))

async function load() {
  loading.value = true; error.value = ''
  if (!auth.user) { data.value = null; loading.value = false; return }
  try { data.value = await api.radioDashboard() } catch (e) { error.value = e.message }
  finally { loading.value = false }
}
watch(() => auth.ready, ready => { if (ready) load() }, { immediate: true })
</script>

<template>
  <div class="radio-page">
    <div class="container">
      <SiteNav />
      <RadioSubnav />
      <main class="radio-main">
        <header class="radio-hero">
          <p class="auth-kicker">{{ copy.kicker }}</p>
          <h1>{{ copy.title }}</h1>
          <p>{{ copy.intro }}</p>
        </header>

        <p v-if="error" class="form-error">{{ error }}</p>
        <section v-if="!auth.user && !loading" class="radio-empty-panel">
          <RouterLink class="primary-action" to="/login">{{ copy.login }} →</RouterLink>
        </section>
        <section v-else-if="data && !data.profile" class="radio-bind-callout">
          <div><span>CALLSIGN / NOT BOUND</span><h2>📻 ———</h2><p>{{ copy.intro }}</p></div>
          <RouterLink class="primary-action compact" to="/radio/station">{{ copy.bind }} →</RouterLink>
        </section>

        <template v-if="data?.profile">
          <section class="radio-station-strip">
            <div><span>CALLSIGN</span><strong>📻 {{ data.profile.callsign }}</strong></div>
            <div><span>CLASS</span><strong>{{ data.profile.operatorClass }}</strong></div>
            <div><span>QTH</span><strong>{{ data.profile.qth || '—' }}</strong></div>
            <RouterLink :to="`/radio/${data.profile.callsign}`">PUBLIC STATION ↗</RouterLink>
          </section>

          <section class="radio-stat-grid">
            <article><span>{{ copy.qso }}</span><strong>{{ data.stats.qsoCount }}</strong></article>
            <article><span>{{ copy.sent }}</span><strong>{{ data.stats.qslSentCount }}</strong></article>
            <article><span>{{ copy.received }}</span><strong>{{ data.stats.qslReceivedCount }}</strong></article>
            <article><span>{{ copy.unread }}</span><strong>{{ data.stats.unreadQslCount }}</strong></article>
          </section>

          <div class="radio-quick-actions">
            <RouterLink class="primary-action" to="/radio/log/new">{{ copy.add }} →</RouterLink>
            <RouterLink class="secondary-action" to="/radio/qsl">{{ copy.qsl }} →</RouterLink>
            <RouterLink class="secondary-action" to="/radio/station">{{ copy.station }} →</RouterLink>
          </div>

          <section class="radio-section">
            <div class="radio-section-head"><span>QSO / LOGBOOK</span><h2>{{ copy.recent }}</h2></div>
            <div v-if="data.recentQsos.length" class="radio-table-wrap">
              <table class="radio-table">
                <thead><tr><th>DATE</th><th>{{ copy.time }}</th><th>{{ copy.remote }}</th><th>{{ copy.freq }}</th><th>{{ copy.mode }}</th><th>RST</th><th>QSL</th></tr></thead>
                <tbody><tr v-for="item in data.recentQsos" :key="item.id"><td>{{ item.date }}</td><td>{{ item.time.slice(0,5) }}</td><td><strong>{{ item.remoteCallsign }}</strong></td><td>{{ item.frequencyMHz.toFixed(3) }} MHz</td><td>{{ item.mode }}</td><td>{{ item.rstSent || '—' }} / {{ item.rstReceived || '—' }}</td><td>{{ item.qslSent ? 'S' : '·' }}{{ item.qslReceived ? 'R' : '·' }}</td></tr></tbody>
              </table>
            </div>
            <p v-else class="comment-empty">{{ copy.noQso }}</p>
          </section>
        </template>
      </main>
    </div>
    <SiteFooter />
  </div>
</template>
