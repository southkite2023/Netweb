<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { api } from '../lib/api'
import { auth } from '../lib/auth'
import { localizedField, projects } from '../data/projects'

const { locale } = useI18n()
const router = useRouter()
const BROADCAST_PROJECT = 'site-broadcast'
const BROADCAST_PREFIX = '__YUASHIE_BROADCAST_V1__\n'

const open = ref(false)
const loading = ref(false)
const messages = ref([])
const selected = ref(null)
const composeOpen = ref(false)
const broadcastTitle = ref('')
const broadcastBody = ref('')
const editingBroadcastId = ref(null)
const posting = ref(false)
const error = ref('')
let refreshTimer

const strings = {
  zh: {
    mailbox: '邮箱', unread: '未读', allRead: '全部已读', empty: '暂时没有邮件。', loading: '正在同步…',
    close: '关闭邮箱', back: '返回列表', openSource: '查看相关页面', compose: '发布全站通告', edit: '编辑通告',
    composeTitle: '全站广播', titleLabel: '通告标题', bodyLabel: '通告内容', publish: '发布通告', update: '更新通告', cancel: '取消',
    replyType: '评论回复', feedbackType: '反馈处理', badgeType: '新徽章', broadcastType: '站内通告',
    replyTitle: name => `${name} 回复了你的评论`, replyBody: (project, text) => `项目 ${project}：${text}`,
    feedbackAdopted: type => type === 'suggestion' ? '你的建议已被采纳' : '你的 Bug 已被确认',
    feedbackRejected: type => type === 'suggestion' ? '你的建议未被采纳' : '你的 Bug 报告已被驳回',
    badgeTitle: name => `你获得了新徽章：${name}`, broadcastSaved: '通告已发布。', broadcastUpdated: '通告已更新。',
    tooLong: '通告标题最多 80 字，正文最多 1400 字。', required: '请填写通告标题和正文。', refresh: '刷新',
  },
  en: {
    mailbox: 'Mailbox', unread: 'Unread', allRead: 'Mark all read', empty: 'No messages yet.', loading: 'Syncing…',
    close: 'Close mailbox', back: 'Back to inbox', openSource: 'Open related page', compose: 'Broadcast', edit: 'Edit notice',
    composeTitle: 'Site broadcast', titleLabel: 'Title', bodyLabel: 'Message', publish: 'Publish', update: 'Update', cancel: 'Cancel',
    replyType: 'Comment reply', feedbackType: 'Feedback update', badgeType: 'New badge', broadcastType: 'Site notice',
    replyTitle: name => `${name} replied to your comment`, replyBody: (project, text) => `Project ${project}: ${text}`,
    feedbackAdopted: type => type === 'suggestion' ? 'Your suggestion was adopted' : 'Your bug report was confirmed',
    feedbackRejected: type => type === 'suggestion' ? 'Your suggestion was declined' : 'Your bug report was rejected',
    badgeTitle: name => `New badge earned: ${name}`, broadcastSaved: 'Notice published.', broadcastUpdated: 'Notice updated.',
    tooLong: 'Title is limited to 80 characters and body to 1,400 characters.', required: 'Enter both a title and message.', refresh: 'Refresh',
  },
  ja: {
    mailbox: 'メール', unread: '未読', allRead: 'すべて既読', empty: '新しいメッセージはありません。', loading: '同期中…',
    close: 'メールを閉じる', back: '一覧に戻る', openSource: '関連ページを開く', compose: '全体告知', edit: '告知を編集',
    composeTitle: 'サイト全体への告知', titleLabel: 'タイトル', bodyLabel: '本文', publish: '公開', update: '更新', cancel: 'キャンセル',
    replyType: 'コメント返信', feedbackType: 'フィードバック', badgeType: '新しいバッジ', broadcastType: 'サイト告知',
    replyTitle: name => `${name} さんがコメントに返信しました`, replyBody: (project, text) => `プロジェクト ${project}：${text}`,
    feedbackAdopted: type => type === 'suggestion' ? '提案が採用されました' : 'Bug報告が確認されました',
    feedbackRejected: type => type === 'suggestion' ? '提案は採用されませんでした' : 'Bug報告は却下されました',
    badgeTitle: name => `新しいバッジを獲得：${name}`, broadcastSaved: '告知を公開しました。', broadcastUpdated: '告知を更新しました。',
    tooLong: 'タイトルは80文字、本文は1400文字以内です。', required: 'タイトルと本文を入力してください。', refresh: '更新',
  },
}

const copy = computed(() => strings[locale.value] || strings.zh)
const readKey = computed(() => auth.user ? `yuashie_mailbox_read:${auth.user.username}` : '')
const readIds = ref(new Set())
const unreadCount = computed(() => messages.value.reduce((total, item) => total + (readIds.value.has(item.key) ? 0 : 1), 0))
const isAdmin = computed(() => auth.user?.role === 'admin')

function loadReadState() {
  if (!readKey.value) return
  try {
    const stored = JSON.parse(localStorage.getItem(readKey.value) || '[]')
    readIds.value = new Set(Array.isArray(stored) ? stored : [])
  } catch {
    readIds.value = new Set()
  }
}

function saveReadState(next) {
  readIds.value = new Set(next)
  if (readKey.value) localStorage.setItem(readKey.value, JSON.stringify([...readIds.value].slice(-1000)))
}

function markRead(item) {
  if (!item || readIds.value.has(item.key)) return
  const next = new Set(readIds.value)
  next.add(item.key)
  saveReadState(next)
}

function markAllRead() {
  saveReadState(new Set([...readIds.value, ...messages.value.map(item => item.key)]))
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale.value === 'zh' ? 'zh-CN' : locale.value, {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function projectTitle(id) {
  const project = projects.find(item => item.id === id)
  return project ? localizedField(project, 'title', locale.value) : id
}

function parseBroadcast(comment) {
  if (comment.status !== 'visible' || comment.parentId || comment.author?.role !== 'admin') return null
  if (!comment.content?.startsWith(BROADCAST_PREFIX)) return null
  try {
    const data = JSON.parse(comment.content.slice(BROADCAST_PREFIX.length))
    if (!data?.title || !data?.body) return null
    return { comment, data }
  } catch {
    return null
  }
}

function feedbackMessage(item) {
  const accepted = item.type === 'suggestion' ? item.status === 'adopted' : ['valid', 'fixed'].includes(item.status)
  const rejected = item.status === 'rejected'
  if (!accepted && !rejected) return null
  const title = accepted ? copy.value.feedbackAdopted(item.type) : copy.value.feedbackRejected(item.type)
  return {
    key: `feedback:${item.id}:${item.status}:${item.updatedAt || item.reviewedAt || ''}`,
    type: rejected ? 'feedback-rejected' : 'feedback',
    typeLabel: copy.value.feedbackType,
    title,
    body: item.adminNote || item.title,
    timestamp: item.reviewedAt || item.updatedAt || item.createdAt,
    route: '/feedback',
  }
}

async function refresh() {
  if (!auth.user || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const projectIds = projects.map(project => project.id)
    const requests = [api.comments(BROADCAST_PROJECT), api.myFeedback(), api.me(), ...projectIds.map(id => api.comments(id))]
    const results = await Promise.allSettled(requests)
    const next = []

    const broadcastResult = results[0]
    if (broadcastResult.status === 'fulfilled') {
      const parsed = (broadcastResult.value.comments || []).map(parseBroadcast).filter(Boolean)
      const replaced = new Set(parsed.map(item => item.data.replaces).filter(Boolean).map(String))
      for (const item of parsed) {
        if (replaced.has(String(item.comment.id))) continue
        next.push({
          key: `broadcast:${item.comment.id}`,
          type: 'broadcast', typeLabel: copy.value.broadcastType,
          title: item.data.title, body: item.data.body, timestamp: item.comment.createdAt,
          broadcastId: item.comment.id,
        })
      }
    }

    const feedbackResult = results[1]
    if (feedbackResult.status === 'fulfilled') {
      for (const item of feedbackResult.value.feedback || []) {
        const message = feedbackMessage(item)
        if (message) next.push(message)
      }
    }

    const meResult = results[2]
    if (meResult.status === 'fulfilled') {
      auth.user = meResult.value.user
      for (const badge of meResult.value.user?.badges || []) {
        next.push({
          key: `badge:${badge.key}:${badge.awardedAt || ''}`,
          type: 'badge', typeLabel: copy.value.badgeType,
          title: copy.value.badgeTitle(badge.name), body: `${badge.emoji || '◆'} ${badge.description || ''}`,
          timestamp: badge.awardedAt, route: `/u/${auth.user.username}`,
        })
      }
    }

    projectIds.forEach((projectId, index) => {
      const result = results[index + 3]
      if (result?.status !== 'fulfilled') return
      const comments = result.value.comments || []
      const byId = new Map(comments.map(comment => [String(comment.id), comment]))
      for (const comment of comments) {
        if (!comment.parentId || comment.status !== 'visible') continue
        const parent = byId.get(String(comment.parentId))
        if (!parent || parent.author?.username !== auth.user.username || comment.author?.username === auth.user.username) continue
        next.push({
          key: `reply:${comment.id}`, type: 'reply', typeLabel: copy.value.replyType,
          title: copy.value.replyTitle(comment.author?.displayName || comment.author?.username || 'User'),
          body: copy.value.replyBody(projectTitle(projectId), comment.content), timestamp: comment.createdAt,
          route: `/projects/${projectId}`,
        })
      }
    })

    const unique = new Map(next.map(item => [item.key, item]))
    messages.value = [...unique.values()]
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 120)

    if (selected.value) selected.value = messages.value.find(item => item.key === selected.value.key) || null
  } catch (cause) {
    error.value = cause?.message || 'Mailbox sync failed.'
  } finally {
    loading.value = false
  }
}

async function toggleMailbox() {
  open.value = !open.value
  selected.value = null
  composeOpen.value = false
  if (open.value) await refresh()
}

function closeMailbox() {
  open.value = false
  selected.value = null
  composeOpen.value = false
}

function selectMessage(item) {
  selected.value = item
  composeOpen.value = false
  markRead(item)
}

function goToMessage(item) {
  if (!item.route) return
  closeMailbox()
  router.push(item.route)
}

function resetComposer() {
  broadcastTitle.value = ''
  broadcastBody.value = ''
  editingBroadcastId.value = null
  composeOpen.value = false
  error.value = ''
}

function startCompose(item = null) {
  selected.value = null
  composeOpen.value = true
  error.value = ''
  if (item?.type === 'broadcast') {
    broadcastTitle.value = item.title
    broadcastBody.value = item.body
    editingBroadcastId.value = item.broadcastId
  } else {
    broadcastTitle.value = ''
    broadcastBody.value = ''
    editingBroadcastId.value = null
  }
}

async function publishBroadcast() {
  const title = broadcastTitle.value.trim()
  const body = broadcastBody.value.trim()
  if (!title || !body) { error.value = copy.value.required; return }
  if (title.length > 80 || body.length > 1400) { error.value = copy.value.tooLong; return }
  posting.value = true
  error.value = ''
  try {
    const payload = { title, body }
    if (editingBroadcastId.value) payload.replaces = editingBroadcastId.value
    await api.postComment(BROADCAST_PROJECT, { content: `${BROADCAST_PREFIX}${JSON.stringify(payload)}` })
    const wasEditing = Boolean(editingBroadcastId.value)
    resetComposer()
    await refresh()
    error.value = wasEditing ? copy.value.broadcastUpdated : copy.value.broadcastSaved
  } catch (cause) {
    error.value = cause?.message || 'Broadcast failed.'
  } finally {
    posting.value = false
  }
}

function iconPath(type) {
  if (type === 'reply') return 'M4 5h16v11H8l-4 4V5Zm4 4h8M8 12h5'
  if (type === 'badge') return 'M12 3l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.2l5-.7L12 3Z'
  if (type === 'broadcast') return 'M4 10v4h4l7 4V6L8 10H4Zm11-1 4-2v10l-4-2M8 14v4'
  return 'M4 5h16v14H4V5Zm0 2 8 6 8-6'
}

onMounted(() => {
  loadReadState()
  refresh()
  refreshTimer = window.setInterval(refresh, 60000)
})

onBeforeUnmount(() => window.clearInterval(refreshTimer))
</script>

<template>
  <div class="mailbox-entry">
    <button class="mailbox-trigger" type="button" :aria-label="copy.mailbox" :title="copy.mailbox" @click="toggleMailbox">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h17v12h-17v-12Zm.5.5 8 6 8-6" /></svg>
      <span v-if="unreadCount" class="mailbox-count">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <Teleport to="body">
      <div v-if="open" class="mailbox-backdrop" @click.self="closeMailbox" @keydown.esc="closeMailbox">
        <section class="mailbox-modal" role="dialog" aria-modal="true" :aria-label="copy.mailbox">
          <header class="mailbox-head">
            <div>
              <span>YUASHIE / MAIL</span>
              <h2>{{ copy.mailbox }}</h2>
            </div>
            <div class="mailbox-head-actions">
              <button v-if="isAdmin" class="mailbox-text-button accent" type="button" @click="startCompose()">{{ copy.compose }}</button>
              <button class="mailbox-icon-button" type="button" :aria-label="copy.close" @click="closeMailbox">×</button>
            </div>
          </header>

          <div v-if="composeOpen" class="mailbox-compose">
            <div class="mailbox-section-label">ADMIN / {{ copy.composeTitle }}</div>
            <label>{{ copy.titleLabel }}<input v-model="broadcastTitle" maxlength="80"></label>
            <label>{{ copy.bodyLabel }}<textarea v-model="broadcastBody" rows="7" maxlength="1400"></textarea></label>
            <div class="mailbox-compose-actions">
              <button class="mailbox-primary" type="button" :disabled="posting" @click="publishBroadcast">{{ editingBroadcastId ? copy.update : copy.publish }}</button>
              <button class="mailbox-text-button" type="button" @click="resetComposer">{{ copy.cancel }}</button>
            </div>
          </div>

          <article v-else-if="selected" class="mailbox-detail">
            <button class="mailbox-text-button" type="button" @click="selected = null">← {{ copy.back }}</button>
            <div class="mailbox-detail-icon" :class="`type-${selected.type}`">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="iconPath(selected.type)" /></svg>
            </div>
            <span class="mailbox-detail-type">{{ selected.typeLabel }}</span>
            <h3>{{ selected.title }}</h3>
            <time>{{ formatTime(selected.timestamp) }}</time>
            <p>{{ selected.body }}</p>
            <div class="mailbox-detail-actions">
              <button v-if="selected.route" class="mailbox-primary" type="button" @click="goToMessage(selected)">{{ copy.openSource }}</button>
              <button v-if="isAdmin && selected.type === 'broadcast'" class="mailbox-text-button accent" type="button" @click="startCompose(selected)">{{ copy.edit }}</button>
            </div>
          </article>

          <div v-else class="mailbox-inbox">
            <div class="mailbox-toolbar">
              <span>{{ copy.unread }} / {{ unreadCount }}</span>
              <div>
                <button class="mailbox-text-button" type="button" :disabled="loading" @click="refresh">{{ copy.refresh }}</button>
                <button class="mailbox-text-button" type="button" :disabled="!unreadCount" @click="markAllRead">{{ copy.allRead }}</button>
              </div>
            </div>
            <p v-if="loading && !messages.length" class="mailbox-empty">{{ copy.loading }}</p>
            <p v-else-if="!messages.length" class="mailbox-empty">{{ copy.empty }}</p>
            <div v-else class="mailbox-list">
              <button v-for="item in messages" :key="item.key" class="mailbox-row" :class="{ unread: !readIds.has(item.key) }" type="button" @click="selectMessage(item)">
                <span class="mailbox-type-icon" :class="`type-${item.type}`"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="iconPath(item.type)" /></svg></span>
                <span class="mailbox-row-copy">
                  <span class="mailbox-row-meta"><b>{{ item.typeLabel }}</b><time>{{ formatTime(item.timestamp) }}</time></span>
                  <strong>{{ item.title }}</strong>
                  <small>{{ item.body }}</small>
                </span>
                <i v-if="!readIds.has(item.key)" aria-label="Unread"></i>
              </button>
            </div>
          </div>

          <p v-if="error" class="mailbox-error" role="status">{{ error }}</p>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.mailbox-entry{display:flex;align-items:center;flex:0 0 auto}.mailbox-trigger{width:38px;height:38px;position:relative;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));border-radius:10px;background:color-mix(in srgb,var(--accent) 5%,var(--card));color:var(--accent);cursor:pointer;backdrop-filter:blur(14px);transition:.2s ease}.mailbox-trigger:hover{transform:translateY(-1px);border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--card))}.mailbox-trigger svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.mailbox-count{position:absolute;right:-7px;top:-7px;min-width:19px;height:19px;padding:0 5px;border:2px solid var(--bg);border-radius:999px;display:grid;place-items:center;background:#ff5d72;color:white;font:800 9px/1 ui-monospace,monospace;box-shadow:0 4px 18px rgba(255,93,114,.35)}
.mailbox-backdrop{position:fixed;inset:0;z-index:3000;display:grid;place-items:center;padding:20px;background:rgba(2,5,8,.46);backdrop-filter:blur(8px)}.mailbox-modal{width:min(840px,100%);max-height:min(760px,calc(100vh - 40px));padding:0!important;border:1px solid color-mix(in srgb,var(--accent) 22%,var(--line));border-radius:24px;overflow:hidden;background:color-mix(in srgb,var(--bg) 78%,transparent);box-shadow:0 32px 110px rgba(0,0,0,.42);backdrop-filter:blur(28px) saturate(135%);display:flex;flex-direction:column}.mailbox-head{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:22px 24px;border-bottom:1px solid var(--line);background:linear-gradient(120deg,color-mix(in srgb,var(--accent) 8%,transparent),transparent 45%)}.mailbox-head span,.mailbox-section-label{display:block;color:var(--accent);font:9px ui-monospace,monospace;letter-spacing:.15em}.mailbox-head h2{margin-top:5px;font-size:24px}.mailbox-head-actions,.mailbox-toolbar>div,.mailbox-compose-actions,.mailbox-detail-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.mailbox-icon-button,.mailbox-text-button,.mailbox-primary{border:0;cursor:pointer}.mailbox-icon-button{width:38px;height:38px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--text);font-size:22px}.mailbox-text-button{padding:9px 10px;background:transparent;color:var(--muted);font:10px ui-monospace,monospace}.mailbox-text-button.accent{color:var(--accent)}.mailbox-text-button:hover{color:var(--text)}.mailbox-text-button:disabled{opacity:.45;cursor:not-allowed}.mailbox-primary{padding:11px 15px;border-radius:9px;background:var(--accent);color:var(--accent-ink);font:700 10px ui-monospace,monospace}.mailbox-primary:disabled{opacity:.5;cursor:wait}
.mailbox-inbox,.mailbox-compose,.mailbox-detail{min-height:0;overflow:auto}.mailbox-toolbar{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:13px 22px;border-bottom:1px solid var(--line);color:var(--muted);font:9px ui-monospace,monospace}.mailbox-list{display:grid}.mailbox-row{width:100%;min-width:0;display:grid;grid-template-columns:46px minmax(0,1fr) 10px;gap:14px;align-items:center;padding:17px 22px;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--text);text-align:left;cursor:pointer;transition:background .18s ease}.mailbox-row:hover{background:var(--card-hover)}.mailbox-row.unread{background:color-mix(in srgb,var(--accent) 4%,transparent)}.mailbox-row>i{width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px color-mix(in srgb,var(--accent) 55%,transparent)}.mailbox-type-icon,.mailbox-detail-icon{display:grid;place-items:center;border:1px solid currentColor;background:color-mix(in srgb,currentColor 8%,transparent)}.mailbox-type-icon{width:42px;height:42px;border-radius:13px}.mailbox-detail-icon{width:54px;height:54px;border-radius:16px;margin-top:25px}.mailbox-type-icon svg,.mailbox-detail-icon svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.type-reply{color:#6edaf5}.type-feedback{color:#69dea9}.type-feedback-rejected{color:#ff7f8e}.type-badge{color:#c49cff}.type-broadcast{color:#77a8ff}.mailbox-row-copy{min-width:0;display:grid;gap:5px}.mailbox-row-meta{display:flex;align-items:center;justify-content:space-between;gap:10px}.mailbox-row-meta b{color:var(--muted);font:8px ui-monospace,monospace;letter-spacing:.08em}.mailbox-row-meta time,.mailbox-detail time{color:var(--muted);font:8px ui-monospace,monospace}.mailbox-row-copy strong{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mailbox-row-copy small{color:var(--muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mailbox-empty{padding:70px 24px;text-align:center;color:var(--muted);font-size:13px}
.mailbox-detail{padding:22px 28px 34px}.mailbox-detail-type{display:block;margin:13px 0 8px;color:var(--muted);font:9px ui-monospace,monospace;letter-spacing:.1em}.mailbox-detail h3{font-size:clamp(24px,4vw,38px);line-height:1.2}.mailbox-detail>time{display:block;margin-top:10px}.mailbox-detail>p{margin:28px 0;color:var(--intro-text);font-size:14px;line-height:1.9;white-space:pre-wrap;overflow-wrap:anywhere}.mailbox-compose{padding:26px;display:grid;gap:18px}.mailbox-compose label{display:grid;gap:8px;color:var(--muted);font:9px ui-monospace,monospace;letter-spacing:.08em}.mailbox-compose input,.mailbox-compose textarea{width:100%;border:1px solid var(--line);border-radius:10px;background:color-mix(in srgb,var(--bg) 72%,transparent);color:var(--text);padding:13px 14px;outline:none;font:14px inherit;resize:vertical}.mailbox-compose input:focus,.mailbox-compose textarea:focus{border-color:var(--accent)}.mailbox-error{margin:0;padding:11px 22px;border-top:1px solid var(--line);color:var(--accent);font:10px/1.6 ui-monospace,monospace;background:color-mix(in srgb,var(--accent) 4%,transparent)}
@media(max-width:820px){.mailbox-backdrop{padding:10px;align-items:end}.mailbox-modal{max-height:calc(100vh - 20px);border-radius:22px 22px 12px 12px}.mailbox-head{padding:18px}.mailbox-head h2{font-size:21px}.mailbox-row{grid-template-columns:42px minmax(0,1fr) 8px;padding:15px 16px;gap:11px}.mailbox-type-icon{width:38px;height:38px}.mailbox-detail{padding:18px 20px 28px}.mailbox-compose{padding:20px}.mailbox-toolbar{padding:12px 16px}.mailbox-trigger{width:36px;height:36px}}
</style>
