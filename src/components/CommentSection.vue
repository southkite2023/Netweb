<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '../lib/api'
import { auth } from '../lib/auth'

const props = defineProps({ projectId: { type: String, required: true } })
const { locale } = useI18n()
const comments = ref([])
const content = ref('')
const replyTo = ref(null)
const replyContent = ref('')
const busy = ref(false)
const error = ref('')

const copy = computed(() => ({
  zh: { title:'评论', intro:'在这里讨论项目、提出想法或补充信息。Bug 与正式建议请提交到反馈中心。', signIn:'登录后发表评论', placeholder:'写下你的评论…', send:'发布评论', reply:'回复', cancel:'取消', deleted:'此评论已删除', remove:'删除', admin:'ADMIN', empty:'还没有评论。成为第一个留言的人。', chars:'最多 2000 字', badge:'佩戴徽章' },
  en: { title:'COMMENTS', intro:'Discuss the project, share ideas, or add context here. Please use Feedback Center for bugs and formal suggestions.', signIn:'Sign in to comment', placeholder:'Write a comment…', send:'Post comment', reply:'Reply', cancel:'Cancel', deleted:'This comment has been deleted.', remove:'Delete', admin:'ADMIN', empty:'No comments yet. Be the first to leave one.', chars:'Up to 2,000 characters', badge:'Equipped badge' },
  ja: { title:'コメント', intro:'プロジェクトについての議論、アイデア、補足情報はこちらへ。Bugや正式な提案はフィードバックセンターをご利用ください。', signIn:'ログインしてコメント', placeholder:'コメントを書く…', send:'投稿', reply:'返信', cancel:'キャンセル', deleted:'このコメントは削除されました。', remove:'削除', admin:'ADMIN', empty:'まだコメントはありません。最初のコメントを投稿しましょう。', chars:'最大2000文字', badge:'装着バッジ' },
}[locale.value]))

const roots = computed(() => comments.value.filter(item => !item.parentId))
const replies = parentId => comments.value.filter(item => Number(item.parentId) === Number(parentId))
const canDelete = item => auth.user && (auth.user.role === 'admin' || auth.user.username === item.author.username)

async function load() {
  error.value = ''
  try { comments.value = (await api.comments(props.projectId)).comments }
  catch (e) { error.value = e.message }
}

async function post(parentId = null) {
  if (!auth.user) return
  const text = parentId ? replyContent.value.trim() : content.value.trim()
  if (!text) return
  busy.value = true
  error.value = ''
  try {
    await api.postComment(props.projectId, { content: text, parentId })
    content.value = ''
    replyContent.value = ''
    replyTo.value = null
    await load()
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}

async function remove(id) {
  error.value = ''
  try { await api.deleteComment(id); await load() }
  catch (e) { error.value = e.message }
}

function startReply(item) {
  replyTo.value = item.id
  replyContent.value = ''
}

onMounted(load)
watch(() => props.projectId, load)
</script>

<template>
  <section class="comments-section">
    <div class="comments-heading">
      <div>
        <span class="section-label">02 / {{ copy.title }}</span>
        <p>{{ copy.intro }}</p>
      </div>
      <strong>{{ comments.filter(c => c.status === 'visible').length }}</strong>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>

    <div v-if="auth.user" class="comment-composer">
      <div class="comment-avatar compact-avatar">
        <img v-if="auth.user.avatarUrl" :src="auth.user.avatarUrl" alt="">
        <span v-else>{{ (auth.user.displayName || auth.user.username).slice(0,1).toUpperCase() }}</span>
      </div>
      <div class="comment-compose-body">
        <textarea v-model="content" maxlength="2000" rows="4" :placeholder="copy.placeholder"></textarea>
        <div class="comment-compose-actions">
          <small>{{ copy.chars }}</small>
          <button class="primary-action compact" :disabled="busy || !content.trim()" @click="post()">{{ copy.send }}</button>
        </div>
      </div>
    </div>
    <RouterLink v-else class="comment-login" to="/login">{{ copy.signIn }} →</RouterLink>

    <div v-if="roots.length" class="comment-list">
      <article v-for="item in roots" :key="item.id" class="comment-thread">
        <div class="comment-row" :class="{ 'is-admin-comment': item.author.role === 'admin' }">
          <RouterLink class="comment-avatar" :to="`/u/${item.author.username}`">
            <img v-if="item.author.avatarUrl" :src="item.author.avatarUrl" alt="">
            <span v-else>{{ (item.author.displayName || item.author.username).slice(0,1).toUpperCase() }}</span>
          </RouterLink>
          <div class="comment-body">
            <div class="comment-meta">
              <RouterLink :to="`/u/${item.author.username}`"><strong>{{ item.author.displayName }}</strong></RouterLink>
              <span class="comment-handle">@{{ item.author.username }}</span>
              <span v-if="item.author.role === 'admin'" class="comment-admin-mark">◆ {{ copy.admin }}</span>
              <span v-if="item.author.equippedBadge" class="comment-badge" :title="item.author.equippedBadge.description">{{ item.author.equippedBadge.emoji }} {{ item.author.equippedBadge.name }}</span>
            </div>
            <p v-if="item.status === 'visible'" class="comment-content">{{ item.content }}</p>
            <p v-else class="comment-deleted">{{ copy.deleted }}</p>
            <div class="comment-tools">
              <time>{{ new Date(item.createdAt).toLocaleString() }}</time>
              <button v-if="item.status === 'visible' && auth.user" @click="startReply(item)">{{ copy.reply }}</button>
              <button v-if="item.status === 'visible' && canDelete(item)" @click="remove(item.id)">{{ copy.remove }}</button>
            </div>

            <div v-if="replyTo === item.id" class="reply-composer">
              <textarea v-model="replyContent" maxlength="2000" rows="3" :placeholder="copy.placeholder"></textarea>
              <div class="comment-compose-actions">
                <button class="text-action" @click="replyTo = null">{{ copy.cancel }}</button>
                <button class="primary-action compact" :disabled="busy || !replyContent.trim()" @click="post(item.id)">{{ copy.reply }}</button>
              </div>
            </div>

            <div v-if="replies(item.id).length" class="reply-list">
              <div v-for="reply in replies(item.id)" :key="reply.id" class="comment-row reply-row" :class="{ 'is-admin-comment': reply.author.role === 'admin' }">
                <RouterLink class="comment-avatar reply-avatar" :to="`/u/${reply.author.username}`">
                  <img v-if="reply.author.avatarUrl" :src="reply.author.avatarUrl" alt="">
                  <span v-else>{{ (reply.author.displayName || reply.author.username).slice(0,1).toUpperCase() }}</span>
                </RouterLink>
                <div class="comment-body">
                  <div class="comment-meta">
                    <RouterLink :to="`/u/${reply.author.username}`"><strong>{{ reply.author.displayName }}</strong></RouterLink>
                    <span class="comment-handle">@{{ reply.author.username }}</span>
                    <span v-if="reply.author.role === 'admin'" class="comment-admin-mark">◆ {{ copy.admin }}</span>
                    <span v-if="reply.author.equippedBadge" class="comment-badge">{{ reply.author.equippedBadge.emoji }} {{ reply.author.equippedBadge.name }}</span>
                  </div>
                  <p v-if="reply.status === 'visible'" class="comment-content">{{ reply.content }}</p>
                  <p v-else class="comment-deleted">{{ copy.deleted }}</p>
                  <div class="comment-tools">
                    <time>{{ new Date(reply.createdAt).toLocaleString() }}</time>
                    <button v-if="reply.status === 'visible' && canDelete(reply)" @click="remove(reply.id)">{{ copy.remove }}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
    <p v-else class="comment-empty">{{ copy.empty }}</p>
  </section>
</template>
