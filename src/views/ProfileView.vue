<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { api } from '../lib/api'
import { auth, signOut } from '../lib/auth'

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const user = ref(null)
const badgeCatalog = ref([])
const contributionEvents = ref([])
const error = ref('')
const editing = ref(false)
const badgeBusy = ref('')
const avatarBusy = ref(false)
const form = ref({ displayName: '', bio: '', website: '' })

const copy = computed(() => ({
  zh: {
    contribution: '贡献值', joined: '加入时间', edit: '编辑资料', signout: '退出登录', about: '个人简介', empty: '暂未填写个人简介。',
    save: '保存', cancel: '取消', website: '个人网站', badges: '徽章', badgeIntro: '完成对应条件即可获得徽章。你可以选择佩戴一个，也可以不佩戴。', equipped: '佩戴中', equip: '佩戴', locked: '未获得',
    unequip: '不佩戴徽章', earned: '已获得', manual: '由管理员确认成员身份后授予。', avatar: '头像', uploadAvatar: '上传头像', removeAvatar: '移除头像', avatarHint: '支持 PNG / JPEG / WebP，文件大小不超过 512 KB。',
    contributionLog: 'Contribution 记录', noContribution: '暂无贡献记录。', adminPanel: '管理员控制台', adminTitle: 'Bug / 建议审核', adminText: '查阅、批复用户反馈，并自动发放 Contribution 与徽章资格。', openAdmin: '打开审核台', feedback: '提交 Bug / 建议',
  },
  en: {
    contribution: 'CONTRIBUTION', joined: 'JOINED', edit: 'Edit profile', signout: 'Sign out', about: 'ABOUT', empty: 'No bio yet.',
    save: 'Save', cancel: 'Cancel', website: 'Website', badges: 'BADGES', badgeIntro: 'Earn badges by meeting their requirements. Equip one beside your name, or wear none.', equipped: 'Equipped', equip: 'Equip', locked: 'Locked',
    unequip: 'Wear no badge', earned: 'Earned', manual: 'Awarded after membership is confirmed by an administrator.', avatar: 'Avatar', uploadAvatar: 'Upload avatar', removeAvatar: 'Remove avatar', avatarHint: 'PNG / JPEG / WebP, maximum file size 512 KB.',
    contributionLog: 'CONTRIBUTION LOG', noContribution: 'No contribution events yet.', adminPanel: 'ADMIN CONSOLE', adminTitle: 'Bug / Suggestion Review', adminText: 'Review feedback and automatically issue Contribution and badge eligibility.', openAdmin: 'Open review console', feedback: 'Submit bug / suggestion',
  },
  ja: {
    contribution: '貢献値', joined: '参加日', edit: 'プロフィール編集', signout: 'ログアウト', about: '自己紹介', empty: '自己紹介はまだありません。',
    save: '保存', cancel: 'キャンセル', website: 'ウェブサイト', badges: 'バッジ', badgeIntro: '条件を満たすとバッジを獲得できます。名前の横に1つ装着するか、何も装着しないこともできます。', equipped: '装着中', equip: '装着', locked: '未獲得',
    unequip: 'バッジを装着しない', earned: '獲得済み', manual: 'メンバー確認後に管理者が付与します。', avatar: 'アバター', uploadAvatar: 'アバターを変更', removeAvatar: 'アバターを削除', avatarHint: 'PNG / JPEG / WebP、最大512 KB。',
    contributionLog: 'Contribution 履歴', noContribution: '貢献履歴はありません。', adminPanel: '管理者コンソール', adminTitle: 'Bug / 提案審査', adminText: 'フィードバックを審査し、Contributionとバッジ資格を自動反映します。', openAdmin: '審査画面を開く', feedback: 'Bug / 提案を送信',
  },
}[locale.value]))

const descriptions = computed(() => ({
  zh: { bug_hunter: '提交 5 个有效 Bug', thinker: '5 个建议被采用', minecraft_pioneer: 'Minecraft Server 成员', founding_member: '网站 Beta 阶段注册（2026.12.31 前）', contribution_1000: '贡献值达到 1000' },
  en: { bug_hunter: 'Submit 5 valid bugs', thinker: 'Have 5 suggestions adopted', minecraft_pioneer: 'Minecraft Server member', founding_member: 'Register during website Beta (before 2026-12-31)', contribution_1000: 'Reach 1,000 Contribution' },
  ja: { bug_hunter: '有効なBugを5件報告', thinker: '提案が5件採用される', minecraft_pioneer: 'Minecraft Server メンバー', founding_member: 'サイトBeta期間中に登録（2026.12.31まで）', contribution_1000: '貢献値1000に到達' },
}[locale.value]))

const mine = computed(() => auth.user?.username === user.value?.username)
const earnedKeys = computed(() => new Set((user.value?.badges || []).map(badge => badge.key)))

function badgeDescription(badge) { return descriptions.value[badge.key] || badge.description }
function badgeNote(badge) { return earnedKeys.value.has(badge.key) ? copy.value.earned : badge.ruleType === 'manual' ? copy.value.manual : copy.value.locked }

function contributionReason(event) {
  const id = event.referenceId ? ` #${event.referenceId}` : ''
  const labels = {
    zh: { ACCOUNT_CREATED: '创建账户', BUG_VALID: `有效 Bug${id}`, SUGGESTION_ADOPTED: `建议被采用${id}` },
    en: { ACCOUNT_CREATED: 'Account created', BUG_VALID: `Valid bug${id}`, SUGGESTION_ADOPTED: `Suggestion adopted${id}` },
    ja: { ACCOUNT_CREATED: 'アカウント作成', BUG_VALID: `有効Bug${id}`, SUGGESTION_ADOPTED: `提案採用${id}` },
  }
  return labels[locale.value]?.[event.type] || event.reason
}

async function load() {
  error.value = ''
  try {
    const [profile, catalog, contributions] = await Promise.all([
      api.user(route.params.username), api.badges(), api.contributions(route.params.username),
    ])
    user.value = profile.user
    badgeCatalog.value = catalog.badges
    contributionEvents.value = contributions.events
    form.value = { displayName: user.value.displayName, bio: user.value.bio || '', website: user.value.website || '' }
  } catch (e) { error.value = e.message }
}

async function save() {
  try {
    const result = await api.updateProfile(form.value)
    user.value = result.user
    auth.user = result.user
    editing.value = false
  } catch (e) { error.value = e.message }
}

async function equipBadge(badgeKey) {
  badgeBusy.value = badgeKey || 'none'
  error.value = ''
  try {
    const result = await api.equipBadge(badgeKey)
    user.value = result.user
    auth.user = result.user
  } catch (e) { error.value = e.message }
  finally { badgeBusy.value = '' }
}

async function pickAvatar(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) { error.value = copy.value.avatarHint; return }
  if (file.size > 512 * 1024) { error.value = copy.value.avatarHint; return }
  avatarBusy.value = true
  error.value = ''
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const result = await api.uploadAvatar(dataUrl)
    user.value = result.user
    auth.user = result.user
  } catch (e) { error.value = e.message }
  finally { avatarBusy.value = false }
}

async function removeAvatar() {
  avatarBusy.value = true
  error.value = ''
  try {
    const result = await api.removeAvatar()
    user.value = result.user
    auth.user = result.user
  } catch (e) { error.value = e.message }
  finally { avatarBusy.value = false }
}

async function logout() { await signOut(); router.push('/') }

onMounted(load)
watch(() => route.params.username, load)
</script>

<template>
  <div class="container">
    <SiteNav />
    <main class="profile-main">
      <p v-if="error" class="form-error">{{ error }}</p>
      <template v-if="user">
        <header class="profile-hero">
          <div class="avatar-node">
            <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="">
            <span v-else>{{ (user.displayName || user.username).slice(0, 1).toUpperCase() }}</span>
          </div>
          <div class="profile-identity">
            <div class="auth-kicker">// PUBLIC IDENTITY · {{ user.role.toUpperCase() }}</div>
            <div class="profile-name-line">
              <h1>{{ user.displayName }}</h1>
              <span v-if="user.equippedBadge" class="equipped-badge" :title="badgeDescription(user.equippedBadge)"><span aria-hidden="true">{{ user.equippedBadge.emoji }}</span>{{ user.equippedBadge.name }}</span>
            </div>
            <p>@{{ user.username }}</p>
          </div>
          <div v-if="mine" class="profile-actions">
            <RouterLink class="secondary-action" to="/feedback">{{ copy.feedback }}</RouterLink>
            <button class="secondary-action" @click="editing = !editing">{{ copy.edit }}</button>
            <button class="text-action" @click="logout">{{ copy.signout }}</button>
          </div>
        </header>

        <section class="profile-grid">
          <div class="profile-card"><span>{{ copy.contribution }}</span><strong>{{ user.contributionPoints }}</strong><small>LV. {{ user.level }}</small></div>
          <div class="profile-card"><span>{{ copy.joined }}</span><strong>{{ new Date(user.createdAt).toLocaleDateString() }}</strong><small>YUASHIE MEMBER</small></div>
          <div class="profile-card wide">
            <span>{{ copy.about }}</span>
            <template v-if="editing">
              <div class="profile-editor">
                <div class="avatar-editor">
                  <span>{{ copy.avatar }}</span>
                  <div class="avatar-editor-actions">
                    <label class="secondary-action avatar-upload-button"><input type="file" accept="image/png,image/jpeg,image/webp" :disabled="avatarBusy" @change="pickAvatar">{{ copy.uploadAvatar }}</label>
                    <button v-if="user.avatarUrl" class="text-action" :disabled="avatarBusy" @click="removeAvatar">{{ copy.removeAvatar }}</button>
                  </div>
                  <small>{{ copy.avatarHint }}</small>
                </div>
                <input v-model="form.displayName" maxlength="40">
                <textarea v-model="form.bio" maxlength="280" rows="5"></textarea>
                <input v-model="form.website" placeholder="https://">
                <div><button class="primary-action compact" @click="save">{{ copy.save }}</button><button class="text-action" @click="editing = false">{{ copy.cancel }}</button></div>
              </div>
            </template>
            <template v-else>
              <p>{{ user.bio || copy.empty }}</p>
              <a v-if="user.website" class="profile-link" :href="user.website" target="_blank" rel="noopener">{{ copy.website }} ↗</a>
            </template>
          </div>
        </section>

        <section v-if="mine && user.role === 'admin'" class="admin-profile-panel">
          <div><span>{{ copy.adminPanel }}</span><h2>{{ copy.adminTitle }}</h2><p>{{ copy.adminText }}</p></div>
          <RouterLink class="primary-action compact" to="/admin/feedback">{{ copy.openAdmin }} →</RouterLink>
        </section>

        <section class="badge-section">
          <div class="badge-section-head">
            <div><span class="badge-section-label">{{ copy.badges }}</span><p>{{ copy.badgeIntro }}</p></div>
            <button v-if="mine && user.equippedBadge" class="secondary-action" :disabled="badgeBusy === 'none'" @click="equipBadge(null)">{{ copy.unequip }}</button>
          </div>
          <div class="badge-grid">
            <article v-for="badge in badgeCatalog" :key="badge.key" class="badge-card" :class="{ earned: earnedKeys.has(badge.key), equipped: user.equippedBadge?.key === badge.key, locked: !earnedKeys.has(badge.key) }">
              <div class="badge-icon" aria-hidden="true">{{ badge.emoji }}</div>
              <div class="badge-copy"><div class="badge-title-row"><strong>{{ badge.name }}</strong><span v-if="user.equippedBadge?.key === badge.key">{{ copy.equipped }}</span></div><p>{{ badgeDescription(badge) }}</p><small>{{ badgeNote(badge) }}</small></div>
              <button v-if="mine && earnedKeys.has(badge.key) && user.equippedBadge?.key !== badge.key" class="badge-equip" :disabled="badgeBusy === badge.key" @click="equipBadge(badge.key)">{{ copy.equip }}</button>
            </article>
          </div>
        </section>

        <section class="contribution-section">
          <div class="badge-section-head"><div><span class="badge-section-label">{{ copy.contributionLog }}</span></div></div>
          <div v-if="contributionEvents.length" class="contribution-list">
            <article v-for="event in contributionEvents" :key="`${event.type}-${event.createdAt}-${event.referenceId || ''}`" class="contribution-row">
              <div><strong>{{ contributionReason(event) }}</strong><small>{{ new Date(event.createdAt).toLocaleString() }}</small></div>
              <span :class="{ negative: event.points < 0 }">{{ event.points > 0 ? '+' : '' }}{{ event.points }}</span>
            </article>
          </div>
          <p v-else class="comment-empty">{{ copy.noContribution }}</p>
        </section>
      </template>
    </main>
    <SiteFooter />
  </div>
</template>
