<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { api } from '../lib/api'
import { auth } from '../lib/auth'

const { locale } = useI18n()
const items = ref([])
const error = ref('')
const busyId = ref(null)
const notes = ref({})

const copy = computed(() => ({
  zh: { kicker:'// ADMIN · FEEDBACK REVIEW', title:'反馈审核台', lead:'查阅并批复用户提交的 Bug 与建议。首次确认有效 Bug 自动奖励 +20 Contribution；首次采纳建议自动奖励 +50。', denied:'仅管理员可访问。', refresh:'刷新', user:'提交者', project:'关联项目', note:'管理员备注', save:'提交批复', new:'待审核', reviewing:'审核中', valid:'确认有效', fixed:'已修复', adopted:'采纳建议', rejected:'拒绝', empty:'当前没有反馈。' },
  en: { kicker:'// ADMIN · FEEDBACK REVIEW', title:'Feedback Review', lead:'Review and resolve submitted bugs and suggestions. First validation of a bug awards +20 Contribution; first adoption of a suggestion awards +50.', denied:'Administrator access only.', refresh:'Refresh', user:'Author', project:'Project', note:'Admin note', save:'Apply review', new:'Pending', reviewing:'Reviewing', valid:'Valid', fixed:'Fixed', adopted:'Adopt', rejected:'Reject', empty:'No feedback.' },
  ja: { kicker:'// ADMIN · FEEDBACK REVIEW', title:'フィードバック審査', lead:'Bugと提案を確認・承認します。Bugの初回有効認定で+20、提案の初回採用で+50 Contributionが自動付与されます。', denied:'管理者のみアクセスできます。', refresh:'更新', user:'投稿者', project:'プロジェクト', note:'管理者メモ', save:'審査を反映', new:'審査待ち', reviewing:'審査中', valid:'有効', fixed:'修正済み', adopted:'採用', rejected:'却下', empty:'フィードバックはありません。' },
}[locale.value]))

function options(item) {
  return item.type === 'bug' ? ['new','reviewing','valid','fixed','rejected'] : ['new','reviewing','adopted','rejected']
}

async function load() {
  error.value = ''
  try {
    items.value = (await api.adminFeedback()).feedback
    notes.value = Object.fromEntries(items.value.map(item => [item.id, item.adminNote || '']))
  } catch (e) { error.value = e.message }
}

async function review(item, status) {
  busyId.value = item.id
  error.value = ''
  try { await api.reviewFeedback(item.id, { status, adminNote: notes.value[item.id] || '' }); await load() }
  catch (e) { error.value = e.message }
  finally { busyId.value = null }
}

onMounted(() => { if (auth.user?.role === 'admin') load() })
watch(() => auth.user?.role, role => { if (role === 'admin') load() })
</script>

<template>
  <div class="container">
    <SiteNav />
    <main class="admin-feedback-main">
      <header class="feedback-hero">
        <p class="auth-kicker">{{ copy.kicker }}</p>
        <h1>{{ copy.title }}</h1>
        <p>{{ copy.lead }}</p>
      </header>
      <p v-if="auth.user?.role !== 'admin'" class="form-error">{{ copy.denied }}</p>
      <template v-else>
        <div class="admin-feedback-toolbar"><button class="secondary-action" @click="load">{{ copy.refresh }}</button></div>
        <p v-if="error" class="form-error">{{ error }}</p>
        <div v-if="items.length" class="admin-feedback-list">
          <article v-for="item in items" :key="item.id" class="admin-feedback-card">
            <div class="admin-feedback-head">
              <div><span>{{ item.type === 'bug' ? '🐛 BUG' : '💡 SUGGESTION' }} · #{{ item.id }}</span><h2>{{ item.title }}</h2></div>
              <span :class="`status-${item.status}`">{{ copy[item.status] || item.status }}</span>
            </div>
            <div class="admin-feedback-meta">
              <RouterLink :to="`/u/${item.username}`">{{ copy.user }}: {{ item.displayName }} @{{ item.username }}</RouterLink>
              <span v-if="item.projectId">{{ copy.project }}: {{ item.projectId }}</span>
              <a v-if="item.pageUrl" :href="item.pageUrl" target="_blank" rel="noopener">URL ↗</a>
              <time>{{ new Date(item.createdAt).toLocaleString() }}</time>
            </div>
            <p class="admin-feedback-content">{{ item.content }}</p>
            <textarea v-model="notes[item.id]" maxlength="2000" rows="3" :placeholder="copy.note"></textarea>
            <div class="review-actions">
              <button v-for="status in options(item)" :key="status" class="secondary-action" :class="{ active: item.status === status }" :disabled="busyId === item.id" @click="review(item,status)">{{ copy[status] || status }}</button>
            </div>
          </article>
        </div>
        <p v-else class="comment-empty">{{ copy.empty }}</p>
      </template>
    </main>
    <SiteFooter />
  </div>
</template>
