<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { api } from '../lib/api'
import { auth } from '../lib/auth'
import { projects, localizedField } from '../data/projects'

const { locale } = useI18n()
const items = ref([])
const busy = ref(false)
const error = ref('')
const success = ref('')
const form = ref({ type: 'bug', title: '', content: '', projectId: '', pageUrl: '' })

const copy = computed(() => ({
  zh: { kicker:'// FEEDBACK CENTER', title:'Bug / 建议反馈中心', lead:'提交可复现的 Bug 或有明确价值的建议。管理员审核后，有效 Bug 与被采用建议会计入 Contribution，并参与徽章判定。', login:'登录后提交反馈', type:'类型', bug:'Bug', suggestion:'建议', titleLabel:'标题', detail:'详细描述', project:'关联项目（可选）', page:'相关页面 URL（可选）', submit:'提交反馈', mine:'我的反馈', empty:'暂时没有反馈记录。', new:'待审核', reviewing:'审核中', valid:'有效 Bug', fixed:'已修复', adopted:'已采用', rejected:'未采纳', adminNote:'管理员备注', reward:'奖励规则：有效 Bug +20 Contribution；建议被采用 +50 Contribution。' },
  en: { kicker:'// FEEDBACK CENTER', title:'Bug / Suggestion Center', lead:'Submit reproducible bugs or concrete suggestions. After admin review, valid bugs and adopted suggestions earn Contribution and count toward badges.', login:'Sign in to submit feedback', type:'TYPE', bug:'Bug', suggestion:'Suggestion', titleLabel:'Title', detail:'Details', project:'Related project (optional)', page:'Related page URL (optional)', submit:'Submit feedback', mine:'MY FEEDBACK', empty:'No feedback yet.', new:'Pending', reviewing:'Reviewing', valid:'Valid bug', fixed:'Fixed', adopted:'Adopted', rejected:'Rejected', adminNote:'Admin note', reward:'Rewards: valid bug +20 Contribution; adopted suggestion +50 Contribution.' },
  ja: { kicker:'// FEEDBACK CENTER', title:'Bug / 提案フィードバック', lead:'再現可能なBugや具体的な提案を送信できます。管理者の審査後、有効Bugと採用提案はContributionとバッジ判定に反映されます。', login:'ログインしてフィードバックを送信', type:'種類', bug:'Bug', suggestion:'提案', titleLabel:'タイトル', detail:'詳細', project:'関連プロジェクト（任意）', page:'関連ページURL（任意）', submit:'送信', mine:'自分のフィードバック', empty:'フィードバック履歴はありません。', new:'審査待ち', reviewing:'審査中', valid:'有効Bug', fixed:'修正済み', adopted:'採用', rejected:'不採用', adminNote:'管理者メモ', reward:'報酬：有効Bug +20 Contribution、採用提案 +50 Contribution。' },
}[locale.value]))

const statusText = status => copy.value[status] || status

async function load() {
  if (!auth.user) return
  try { items.value = (await api.myFeedback()).feedback }
  catch (e) { error.value = e.message }
}

async function submit() {
  busy.value = true
  error.value = ''
  success.value = ''
  try {
    await api.submitFeedback({ ...form.value, projectId: form.value.projectId || null })
    form.value = { type: 'bug', title: '', content: '', projectId: '', pageUrl: '' }
    success.value = locale.value === 'zh' ? '反馈已提交。' : locale.value === 'ja' ? '送信しました。' : 'Feedback submitted.'
    await load()
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}

onMounted(load)
watch(() => auth.user?.username, () => load())
</script>

<template>
  <div class="container">
    <SiteNav />
    <main class="feedback-main">
      <header class="feedback-hero">
        <p class="auth-kicker">{{ copy.kicker }}</p>
        <h1>{{ copy.title }}</h1>
        <p>{{ copy.lead }}</p>
        <small>{{ copy.reward }}</small>
      </header>

      <p v-if="error" class="form-error">{{ error }}</p>
      <p v-if="success" class="form-success">{{ success }}</p>

      <section v-if="auth.user" class="feedback-layout">
        <form class="feedback-form" @submit.prevent="submit">
          <label>{{ copy.type }}
            <div class="feedback-type-switch">
              <button type="button" :class="{active: form.type==='bug'}" @click="form.type='bug'">🐛 {{ copy.bug }}</button>
              <button type="button" :class="{active: form.type==='suggestion'}" @click="form.type='suggestion'">💡 {{ copy.suggestion }}</button>
            </div>
          </label>
          <label>{{ copy.titleLabel }}<input v-model="form.title" maxlength="120" required></label>
          <label>{{ copy.detail }}<textarea v-model="form.content" maxlength="4000" minlength="10" rows="8" required></textarea></label>
          <label>{{ copy.project }}
            <select v-model="form.projectId">
              <option value="">—</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.id }} · {{ localizedField(project,'title',locale) }}</option>
            </select>
          </label>
          <label>{{ copy.page }}<input v-model="form.pageUrl" maxlength="500" placeholder="https://yuashie.cn/..."></label>
          <button class="primary-action" :disabled="busy">{{ copy.submit }}</button>
        </form>

        <div class="feedback-history">
          <span class="section-label">{{ copy.mine }}</span>
          <div v-if="items.length" class="feedback-list">
            <article v-for="item in items" :key="item.id" class="feedback-card">
              <div class="feedback-card-head">
                <span>{{ item.type === 'bug' ? '🐛' : '💡' }} #{{ item.id }}</span>
                <strong :class="`status-${item.status}`">{{ statusText(item.status) }}</strong>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.content }}</p>
              <small>{{ new Date(item.createdAt).toLocaleString() }}</small>
              <div v-if="item.adminNote" class="admin-note"><b>{{ copy.adminNote }}</b><p>{{ item.adminNote }}</p></div>
            </article>
          </div>
          <p v-else class="comment-empty">{{ copy.empty }}</p>
        </div>
      </section>
      <RouterLink v-else class="comment-login" to="/login">{{ copy.login }} →</RouterLink>
    </main>
    <SiteFooter />
  </div>
</template>
