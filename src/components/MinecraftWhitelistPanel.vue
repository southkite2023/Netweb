<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '../lib/api'
import { auth } from '../lib/auth'

const SERVER_ADDRESS = 's205.singsi.cn:19854'
const { locale } = useI18n()
const minecraftName = ref('')
const account = ref(null)
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const copied = ref(false)

const copy = computed(() => ({
  zh: {
    label: '02 / SERVER ACCESS',
    title: '加入服务器白名单',
    intro: '使用你的 YUASHIE Account 绑定一个 Minecraft Java Edition ID。每个网站账号只能绑定一个 MC ID，同一个 MC ID 也只能绑定一次。',
    loginTitle: '需要先登录',
    loginText: '白名单登记与网站账号绑定。登录后会自动返回项目 002。',
    login: '登录后登记',
    idLabel: 'MINECRAFT ID',
    idHint: '3–16 位，仅支持英文字母、数字和下划线。绑定后不可在网页自行更换。',
    bind: '绑定并加入白名单',
    binding: '正在提交…',
    server: '服务器地址',
    status: '白名单状态',
    active: '已加入白名单',
    pending: '已记录 · 等待服务器同步',
    error: '已记录 · 同步失败',
    retry: '重新同步',
    retrying: '正在同步…',
    bound: '已绑定 MC ID',
    copyAddress: '复制地址',
    copied: '已复制',
    loading: '正在读取绑定状态…',
    locked: '此绑定已锁定为一对一关系。如确需更换，请联系站点管理员处理。',
  },
  en: {
    label: '02 / SERVER ACCESS',
    title: 'Join the server whitelist',
    intro: 'Bind one Minecraft Java Edition ID to your YUASHIE Account. Each site account can bind one MC ID, and each MC ID can only be bound once.',
    loginTitle: 'Sign in required',
    loginText: 'Whitelist registration is tied to your site account. You will return to Project 002 after signing in.',
    login: 'Sign in to register',
    idLabel: 'MINECRAFT ID',
    idHint: '3–16 characters: letters, numbers and underscores only. The binding cannot be changed from the site after submission.',
    bind: 'Bind and join whitelist',
    binding: 'Submitting…',
    server: 'Server address',
    status: 'Whitelist status',
    active: 'Whitelisted',
    pending: 'Recorded · waiting for server sync',
    error: 'Recorded · sync failed',
    retry: 'Retry sync',
    retrying: 'Syncing…',
    bound: 'Bound MC ID',
    copyAddress: 'Copy address',
    copied: 'Copied',
    loading: 'Loading binding status…',
    locked: 'This is a one-to-one binding. Contact the site administrator if it must be changed.',
  },
  ja: {
    label: '02 / SERVER ACCESS',
    title: 'サーバーのホワイトリストに参加',
    intro: 'YUASHIE Account に Minecraft Java Edition の ID を1つ紐付けます。サイトアカウント1つにつきMC IDは1つ、同じMC IDも1回だけ登録できます。',
    loginTitle: 'ログインが必要です',
    loginText: 'ホワイトリスト登録はサイトアカウントに紐付きます。ログイン後、自動的に Project 002 に戻ります。',
    login: 'ログインして登録',
    idLabel: 'MINECRAFT ID',
    idHint: '3〜16文字。英字・数字・アンダースコアのみ。登録後はサイト上で変更できません。',
    bind: '紐付けてホワイトリストへ追加',
    binding: '送信中…',
    server: 'サーバーアドレス',
    status: 'ホワイトリスト状態',
    active: 'ホワイトリスト登録済み',
    pending: '記録済み · サーバー同期待ち',
    error: '記録済み · 同期失敗',
    retry: '再同期',
    retrying: '同期中…',
    bound: '登録済み MC ID',
    copyAddress: 'アドレスをコピー',
    copied: 'コピーしました',
    loading: '登録状態を確認中…',
    locked: 'この紐付けは1対1で固定されています。変更が必要な場合はサイト管理者に連絡してください。',
  },
}[locale.value] || {}) )

const statusText = computed(() => {
  if (!account.value) return ''
  return copy.value[account.value.status] || account.value.status
})

async function loadAccount() {
  if (!auth.ready || !auth.user) {
    account.value = null
    return
  }
  loading.value = true
  error.value = ''
  try {
    account.value = (await api.minecraftAccount()).account
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function bind() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    account.value = (await api.bindMinecraft(minecraftName.value)).account
    minecraftName.value = ''
  } catch (e) {
    error.value = e.message
    await loadAccount().catch(() => {})
  } finally {
    busy.value = false
  }
}

async function retrySync() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    account.value = (await api.syncMinecraft()).account
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function copyServerAddress() {
  try {
    await navigator.clipboard.writeText(SERVER_ADDRESS)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1600)
  } catch {
    copied.value = false
  }
}

watch(() => [auth.ready, auth.user?.id], loadAccount, { immediate: true })
</script>

<template>
  <section class="minecraft-access" aria-labelledby="minecraft-access-title">
    <div class="minecraft-access-copy">
      <p class="section-label">{{ copy.label }}</p>
      <h2 id="minecraft-access-title">{{ copy.title }}</h2>
      <p>{{ copy.intro }}</p>
      <div class="minecraft-server-address">
        <span>{{ copy.server }}</span>
        <strong>{{ SERVER_ADDRESS }}</strong>
        <button type="button" @click="copyServerAddress">{{ copied ? copy.copied : copy.copyAddress }}</button>
      </div>
    </div>

    <div class="minecraft-access-panel">
      <div v-if="!auth.ready || loading" class="minecraft-state minecraft-state-muted">
        <span>SYNC</span>
        <strong>{{ copy.loading }}</strong>
      </div>

      <div v-else-if="!auth.user" class="minecraft-state">
        <span>YUASHIE ACCOUNT</span>
        <h3>{{ copy.loginTitle }}</h3>
        <p>{{ copy.loginText }}</p>
        <RouterLink class="primary-action minecraft-login" :to="{ path: '/login', query: { redirect: '/projects/002' } }">
          {{ copy.login }}
        </RouterLink>
      </div>

      <div v-else-if="account" class="minecraft-state">
        <span>{{ copy.bound }}</span>
        <div class="minecraft-bound-id">{{ account.minecraftName }}</div>
        <div class="minecraft-status-row">
          <span>{{ copy.status }}</span>
          <strong :class="`minecraft-status-${account.status}`">{{ statusText }}</strong>
        </div>
        <p class="minecraft-lock-note">{{ copy.locked }}</p>
        <button v-if="account.status !== 'active'" class="secondary-action" type="button" :disabled="busy" @click="retrySync">
          {{ busy ? copy.retrying : copy.retry }}
        </button>
      </div>

      <form v-else class="minecraft-bind-form" @submit.prevent="bind">
        <label>
          {{ copy.idLabel }}
          <input
            v-model.trim="minecraftName"
            name="minecraftName"
            autocomplete="off"
            minlength="3"
            maxlength="16"
            pattern="[A-Za-z0-9_]{3,16}"
            placeholder="Steve"
            required
          >
        </label>
        <p class="form-hint">{{ copy.idHint }}</p>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="primary-action" type="submit" :disabled="busy">
          {{ busy ? copy.binding : copy.bind }}
        </button>
      </form>

      <p v-if="error && account" class="form-error minecraft-panel-error">{{ error }}</p>
    </div>
  </section>
</template>
