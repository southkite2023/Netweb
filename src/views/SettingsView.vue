<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AccountMethods from '../components/AccountMethods.vue'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { api } from '../lib/api'
import { auth, signOut } from '../lib/auth'
import { openDevices } from '../lib/accountPanels'

const router = useRouter()
const { locale } = useI18n()
const user = ref(null)
const badgeCatalog = ref([])
const error = ref('')
const saving = ref(false)
const saved = ref(false)
const loading = ref(true)
const badgeBusy = ref('')
const avatarBusy = ref(false)
const form = ref({ displayName: '', bio: '', website: '' })

const copy = computed(() => ({
  zh: {
    contribution: '贡献值', joined: '加入时间', edit: '编辑资料', devices: '登录设备', signout: '退出登录', about: '个人简介', empty: '暂未填写个人简介。',
    save: '保存', cancel: '取消', website: '个人网站', badges: '徽章', badgeIntro: '完成对应条件即可获得徽章。你可以选择佩戴一个，也可以不佩戴。', equipped: '佩戴中', equip: '佩戴', locked: '未获得',
    unequip: '不佩戴徽章', earned: '已获得', manual: '由管理员确认成员身份后授予。', avatar: '头像', uploadAvatar: '上传头像', removeAvatar: '移除头像', avatarHint: '支持 PNG / JPEG / WebP，文件大小不超过 512 KB。',
    contributionLog: 'Contribution 记录', noContribution: '暂无贡献记录。', adminPanel: '管理员控制台', adminTitle: 'Bug / 建议审核', adminText: '查阅、批复用户反馈，并自动发放 Contribution 与徽章资格。', openAdmin: '打开审核台', feedback: '提交 Bug / 建议',
  },
  en: {
    contribution: 'CONTRIBUTION', joined: 'JOINED', edit: 'Edit profile', devices: 'Signed-in devices', signout: 'Sign out', about: 'ABOUT', empty: 'No bio yet.',
    save: 'Save', cancel: 'Cancel', website: 'Website', badges: 'BADGES', badgeIntro: 'Earn badges by meeting their requirements. Equip one beside your name, or wear none.', equipped: 'Equipped', equip: 'Equip', locked: 'Locked',
    unequip: 'Wear no badge', earned: 'Earned', manual: 'Awarded after membership is confirmed by an administrator.', avatar: 'Avatar', uploadAvatar: 'Upload avatar', removeAvatar: 'Remove avatar', avatarHint: 'PNG / JPEG / WebP, maximum file size 512 KB.',
    contributionLog: 'CONTRIBUTION LOG', noContribution: 'No contribution events yet.', adminPanel: 'ADMIN CONSOLE', adminTitle: 'Bug / Suggestion Review', adminText: 'Review feedback and automatically issue Contribution and badge eligibility.', openAdmin: 'Open review console', feedback: 'Submit bug / suggestion',
  },
  ja: {
    contribution: '貢献値', joined: '参加日', edit: 'プロフィール編集', devices: 'ログイン端末', signout: 'ログアウト', about: '自己紹介', empty: '自己紹介はまだありません。',
    save: '保存', cancel: 'キャンセル', website: 'ウェブサイト', badges: 'バッジ', badgeIntro: '条件を満たすとバッジを獲得できます。名前の横に1つ装着するか、何も装着しないこともできます。', equipped: '装着中', equip: '装着', locked: '未獲得',
    unequip: 'バッジを装着しない', earned: '獲得済み', manual: 'メンバー確認後に管理者が付与します。', avatar: 'アバター', uploadAvatar: 'アバターを変更', removeAvatar: 'アバターを削除', avatarHint: 'PNG / JPEG / WebP、最大512 KB。',
    contributionLog: 'Contribution 履歴', noContribution: '貢献履歴はありません。', adminPanel: '管理者コンソール', adminTitle: 'Bug / 提案審査', adminText: 'フィードバックを審査し、Contributionとバッジ資格を自動反映します。', openAdmin: '審査画面を開く', feedback: 'Bug / 提案を送信',
  },
}[locale.value]))

const descriptions = computed(() => ({
  zh: { bug_hunter: '提交 5 个有效 Bug', thinker: '5 个建议被采用', minecraft_pioneer: 'Minecraft Server 成员', founding_member: '网站 Beta 阶段注册（2026.12.31 前）', contribution_1000: '贡献值达到 1000', radio_operator: '绑定业余无线电呼号' },
  en: { bug_hunter: 'Submit 5 valid bugs', thinker: 'Have 5 suggestions adopted', minecraft_pioneer: 'Minecraft Server member', founding_member: 'Register during website Beta (before 2026-12-31)', contribution_1000: 'Reach 1,000 Contribution', radio_operator: 'Bind an amateur-radio callsign' },
  ja: { bug_hunter: '有効なBugを5件報告', thinker: '提案が5件採用される', minecraft_pioneer: 'Minecraft Server メンバー', founding_member: 'サイトBeta期間中に登録（2026.12.31まで）', contribution_1000: '貢献値1000に到達', radio_operator: 'アマチュア無線コールサインを登録' },
}[locale.value]))

const mine = computed(() => auth.user?.username === user.value?.username)
const earnedKeys = computed(() => new Set((user.value?.badges || []).map(badge => badge.key)))

function badgeDescription(badge) { return descriptions.value[badge.key] || badge.description }
function badgeNote(badge) { return earnedKeys.value.has(badge.key) ? copy.value.earned : badge.ruleType === 'manual' ? copy.value.manual : copy.value.locked }

let loadId = 0
async function load() {
  const id = ++loadId
  user.value = null
  loading.value = true
  error.value = ''
  try {
    if (!auth.user) { user.value = null; return }
    const [profile, catalog] = await Promise.all([api.me(), api.badges()])
    if (id !== loadId || !auth.user || auth.user.id !== profile.user?.id) return
    user.value = profile.user
    badgeCatalog.value = catalog.badges || []
    form.value = { displayName: user.value.displayName, bio: user.value.bio || '', website: user.value.website || '' }
  } catch (e) { error.value = e.message }
  finally { if (id === loadId) loading.value = false }
}

async function save() {
  if (saving.value) return
  saving.value = true; saved.value = false; error.value = ''
  try {
    const result = await api.updateProfile(form.value)
    user.value = result.user
    auth.user = result.user
    saved.value = true
  } catch (e) { error.value = e.message }
  finally { saving.value = false }
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

const ui = computed(() => ({
 zh: { title:'账号设置', profile:'个人资料', security:'安全与登录', public:'公开主页', name:'昵称', hint:'管理你的个人名片和账号。', private:'私密设置 · 仅本人可见', loading:'正在加载设置…', saved:'资料已保存', retry:'重新加载', reset:'重置修改' },
 en: { title:'Account settings', profile:'Profile', security:'Security & sign-in', public:'Public profile', name:'Display name', hint:'Manage your identity and account.', private:'Private · Only you', loading:'Loading settings…', saved:'Profile saved', retry:'Try again', reset:'Reset changes' },
 ja: { title:'アカウント設定', profile:'プロフィール', security:'セキュリティとログイン', public:'公開プロフィール', name:'表示名', hint:'プロフィールとアカウントを管理。', private:'非公開・本人のみ', loading:'読み込み中…', saved:'保存しました', retry:'再読み込み', reset:'変更をリセット' },
}[locale.value] || { title:'Settings' }))
function resetForm() { form.value = { displayName:user.value.displayName, bio:user.value.bio || '', website:user.value.website || '' }; saved.value = false }
onMounted(load)
watch(() => auth.user?.id, load)
</script>

<template>
 <div class="container"><SiteNav />
 <main class="settings-shell">
  <header class="settings-heading"><div><p class="settings-eyebrow">ACCOUNT / SETTINGS</p><h1>{{ ui.title }}</h1><p>{{ ui.hint }}</p></div><RouterLink v-if="auth.user" class="secondary-action" :to="`/u/${encodeURIComponent(auth.user.username)}`">{{ ui.public }} ↗</RouterLink></header>
  <p v-if="!auth.user && auth.ready" class="settings-panel"><RouterLink to="/login">{{ locale === 'zh' ? '请先登录以管理账号' : locale === 'ja' ? 'ログインして設定を管理' : 'Sign in to manage your account' }} →</RouterLink></p>
  <p v-if="loading && auth.user" role="status">{{ ui.loading }}</p>
  <div v-if="error" class="form-error" role="alert">{{ error }} <button class="text-action" @click="load">{{ ui.retry }}</button></div>
  <div v-if="user && mine" class="settings-layout">
   <aside class="settings-sidebar settings-panel">
    <div class="settings-identity"><div class="settings-avatar"><img v-if="user.avatarUrl" :src="user.avatarUrl" alt=""><span v-else>{{ (user.displayName || user.username).slice(0,1).toUpperCase() }}</span></div><div><strong>{{ user.displayName || user.username }}</strong><small>@{{ user.username }} · LV. {{ user.level }}</small></div></div>
    <div class="settings-metrics"><span>{{ copy.contribution }} <b>{{ user.contributionPoints }}</b></span><span>{{ copy.badges }} <b>{{ user.badges?.length || 0 }}</b></span></div>
    <nav class="settings-nav" :aria-label="ui.title"><a href="#settings-profile">01 <span>{{ ui.profile }}</span> ↗</a><a href="#settings-security">02 <span>{{ ui.security }}</span> ↗</a><a href="#settings-badges">03 <span>{{ copy.badges }}</span> ↗</a></nav>
    <div class="settings-shortcuts"><button class="secondary-action" @click="openDevices">{{ copy.devices }}</button><RouterLink class="secondary-action" to="/feedback">{{ copy.feedback }}</RouterLink><button class="text-action" @click="logout">{{ copy.signout }}</button></div><p class="settings-private">{{ ui.private }}</p>
   </aside>
   <div class="settings-content">
    <section id="settings-profile" class="settings-panel">
     <div class="settings-section-heading"><h2>{{ ui.profile }}</h2><span>01 / PROFILE</span></div>
     <form class="settings-form" @submit.prevent="save" @input="saved = false">
      <div class="settings-avatar-row"><div class="settings-avatar"><img v-if="user.avatarUrl" :src="user.avatarUrl" alt=""><span v-else>{{ (user.displayName || user.username).slice(0,1).toUpperCase() }}</span></div><div><div class="settings-avatar-actions"><label class="secondary-action settings-upload"><input type="file" accept="image/png,image/jpeg,image/webp" :disabled="avatarBusy" @change="pickAvatar">{{ copy.uploadAvatar }}</label><button v-if="user.avatarUrl" type="button" class="text-action" :disabled="avatarBusy" @click="removeAvatar">{{ copy.removeAvatar }}</button></div><small>{{ copy.avatarHint }}</small></div></div>
      <div class="settings-fields"><label>{{ ui.name }}<input v-model="form.displayName" maxlength="40" required autocomplete="nickname"></label><label>{{ copy.website }}<input v-model="form.website" type="url" maxlength="500" placeholder="https://" autocomplete="url"></label></div>
      <label>{{ copy.about }}<textarea v-model="form.bio" maxlength="280" rows="3"></textarea><small class="settings-count">{{ form.bio.length }} / 280</small></label>
      <div class="settings-save"><button class="primary-action compact" :disabled="saving">{{ copy.save }}</button><button class="text-action" type="button" :disabled="saving" @click="resetForm">{{ ui.reset }}</button><span v-if="saved" role="status">✓ {{ ui.saved }}</span></div>
     </form>
    </section>
    <details id="settings-security" class="settings-panel settings-security"><summary><span>{{ ui.security }}</span><small>02 / SECURITY</small></summary><AccountMethods :key="user.id" /></details>
        <section id="settings-badges" class="badge-section settings-panel">
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
    <section v-if="user.role === 'admin'" class="settings-panel settings-admin"><div><h2>{{ copy.adminTitle }}</h2><p>{{ copy.adminText }}</p></div><RouterLink class="secondary-action" to="/admin/feedback">{{ copy.openAdmin }} ↗</RouterLink></section>
   </div>
  </div>
 </main><SiteFooter /></div>
</template>
<style scoped>
.settings-shell{max-width:1100px;margin:0 auto;padding:28px 0 56px;min-height:65vh}.settings-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}.settings-heading h1{font-size:28px;letter-spacing:-.04em;margin:6px 0}.settings-heading p{font-size:12px;color:var(--muted);margin:0}.settings-heading .settings-eyebrow{font:10px monospace;letter-spacing:.15em;color:var(--accent)}.settings-layout{display:grid;grid-template-columns:248px minmax(0,1fr);gap:18px;align-items:start}.settings-panel{padding:22px;border:1px solid var(--line);border-radius:16px;background:var(--bg-soft);min-width:0;scroll-margin-top:24px}.settings-sidebar{position:sticky;top:20px;padding:18px}.settings-identity{display:flex;align-items:center;gap:12px;min-width:0}.settings-identity>div:last-child{min-width:0}.settings-identity strong{font-size:15px;overflow-wrap:anywhere}.settings-identity small{display:block;font-size:11px;color:var(--muted);margin-top:5px;overflow-wrap:anywhere}.settings-avatar{width:48px;height:48px;flex-shrink:0;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--accent);display:grid;place-items:center;font-size:22px;overflow:hidden}.settings-avatar img{width:100%;height:100%;object-fit:cover}.settings-metrics{display:flex;gap:15px;margin:18px 0;padding:12px 0;border-block:1px solid var(--line);font-size:11px;color:var(--muted)}.settings-metrics b{color:var(--text);margin-left:4px}.settings-nav{justify-content:stretch;grid-template-columns:1fr;height:auto;display:grid;gap:5px;margin:0;align-items:stretch}.settings-nav a{display:flex;gap:12px;padding:11px;border-radius:8px;font:11px monospace;color:var(--accent);background:var(--bg)}.settings-nav a span{flex:1;color:var(--text)}.settings-shortcuts{display:grid;gap:8px;margin-top:18px}.settings-shortcuts .secondary-action{text-align:left;font-size:11px;padding:10px 12px;border-radius:8px}.settings-private{font-size:10px;color:var(--muted);margin:14px 0 0}.settings-content{display:grid;gap:16px;min-width:0}.settings-section-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;gap:12px}.settings-section-heading h2,.settings-admin h2{font-size:16px;margin:0}.settings-section-heading>span{font:10px monospace;color:var(--muted)}.settings-form{display:grid;gap:14px}.settings-avatar-row{display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:1px solid var(--line)}.settings-avatar-row small{display:block;font-size:11px;color:var(--muted);line-height:1.5;margin-top:6px}.settings-avatar-actions{display:flex;align-items:center;flex-wrap:wrap;gap:6px}.settings-avatar-actions .secondary-action{padding:8px 10px;font-size:11px;border-radius:6px}.settings-upload{cursor:pointer;display:inline-flex}.settings-upload input{position:absolute;width:1px;height:1px;opacity:0}.settings-upload:focus-within{outline:2px solid var(--accent);outline-offset:3px}.settings-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}.settings-form label{display:grid;gap:7px;font-size:12px;color:var(--muted)}.settings-form .settings-upload{display:inline-flex;color:var(--text)}.settings-form input:not([type=file]),.settings-form textarea{box-sizing:border-box;width:100%;min-width:0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text);font:inherit;font-size:14px;line-height:1.5}.settings-form textarea{resize:vertical;min-height:80px}.settings-form input:focus,.settings-form textarea:focus{outline:2px solid var(--accent);outline-offset:2px}.settings-count{text-align:right;font-size:10px}.settings-save{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.settings-save>span{font-size:12px;color:var(--accent)}.settings-save button{border-radius:8px}.settings-security summary{display:flex;align-items:center;justify-content:space-between;gap:14px;cursor:pointer;font-size:15px;font-weight:600}.settings-security summary:after{content:'+';color:var(--accent)}.settings-security[open] summary:after{content:'−'}.settings-security summary small{font:10px monospace;color:var(--muted);margin-left:auto}.settings-security :deep(.account-methods){margin:18px 0 0;padding:0;border:0;max-width:none;background:transparent}.settings-security :deep(.account-brand){display:none}.settings-security :deep(h2){font-size:16px;margin:12px 0}.settings-security :deep(.auth-form){gap:12px;max-width:none}.settings-security :deep(.method-list li){padding:10px 0}.settings-security :deep(.auth-form input){padding:10px 12px}.badge-section{margin:0;padding:22px}.badge-section-head{gap:12px;margin-bottom:16px;align-items:start}.badge-section-label{font-size:14px;letter-spacing:0;margin-bottom:7px;color:var(--text)}.badge-section-head p{font-size:11px;line-height:1.6}.badge-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.badge-card{min-height:0;padding:12px;gap:10px;grid-template-columns:32px minmax(0,1fr);border-radius:10px}.badge-icon{width:32px;height:32px;font-size:18px;border-radius:8px}.badge-title-row strong{font-size:12px}.badge-copy p{font-size:11px;margin:6px 0}.badge-equip{grid-column:2;justify-self:start;padding:7px 10px}.settings-admin{display:flex;align-items:center;gap:16px;justify-content:space-between}.settings-admin p{font-size:12px;color:var(--muted);margin-top:8px}
@media(max-width:760px){.settings-shell{padding:20px 0 40px}.settings-layout{grid-template-columns:1fr;gap:14px}.settings-sidebar{position:static}.settings-shortcuts{display:flex;flex-wrap:wrap;margin-top:12px}.settings-nav{grid-template-columns:repeat(3,1fr)}.settings-nav a{gap:6px;padding:10px 8px;font-size:10px}.settings-metrics{margin:12px 0;padding:10px 0}.settings-heading h1{font-size:24px}.settings-panel{padding:18px}.settings-heading>.secondary-action{font-size:10px;padding:10px}.settings-private{margin-top:10px}.settings-admin{flex-wrap:wrap}}
@media(max-width:440px){.settings-fields,.badge-grid{grid-template-columns:1fr}.settings-section-heading>span,.settings-security summary small{display:none}.settings-nav a{font-size:10px;gap:4px}.settings-avatar-row{align-items:flex-start}.settings-avatar-actions .text-action{padding:7px}.badge-section-head{flex-direction:column}.settings-heading>div>p:last-child{max-width:210px;line-height:1.5}}
</style>
