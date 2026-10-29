<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { api } from '../lib/api'
import { auth } from '../lib/auth'
const route = useRoute()
const { locale } = useI18n()
const user = ref(null)
const events = ref([])
const loading = ref(true)
const error = ref('')
const activityError = ref(false)
const words = {
 zh: { title:'个人空间', overview:'概览', posts:'发布', collections:'收藏', likes:'点赞', following:'关注', followers:'粉丝', badges:'徽章', settings:'设置', about:'个人资料', joined:'加入时间', bio:'个性签名', noBio:'尚未填写个性签名。', website:'个人网站', contribution:'贡献值', activity:'近期贡献活动', earned:'已获徽章', empty:'这里还没有内容', unavailable:'此功能尚未开放，暂无可展示的数据。', noEvents:'还没有贡献记录。', noBadges:'还没有获得徽章。', privacy:'此页仅展示公开资料。账号、登录方式与安全设置仅本人可管理。', loading:'正在加载个人空间…', retry:'重新加载', activityError:'贡献记录暂时无法加载', viewAll:'查看徽章', created:'创建账户', bug:'有效 Bug', suggestion:'建议被采用', public:'公开主页', unknown:'暂不可用' },
 en: { title:'Personal space', overview:'Overview', posts:'Posts', collections:'Collections', likes:'Likes', following:'Following', followers:'Followers', badges:'Badges', settings:'Settings', about:'Profile', joined:'Joined', bio:'Bio', noBio:'No bio yet.', website:'Website', contribution:'Contribution', activity:'Recent contributions', earned:'Badges earned', empty:'Nothing here yet', unavailable:'This feature is not available yet. There is no data to display.', noEvents:'No contribution events yet.', noBadges:'No badges earned yet.', privacy:'Only public information appears here. Account and security settings are available to the owner.', loading:'Loading personal space…', retry:'Try again', activityError:'Contribution history is unavailable', viewAll:'View badges', created:'Account created', bug:'Valid bug', suggestion:'Suggestion adopted', public:'Public profile', unknown:'Unavailable' },
 ja: { title:'パーソナルスペース', overview:'概要', posts:'投稿', collections:'保存', likes:'いいね', following:'フォロー', followers:'フォロワー', badges:'バッジ', settings:'設定', about:'プロフィール', joined:'参加日', bio:'自己紹介', noBio:'自己紹介はまだありません。', website:'ウェブサイト', contribution:'貢献値', activity:'最近の貢献', earned:'獲得バッジ', empty:'まだコンテンツがありません', unavailable:'この機能はまだ利用できません。表示できるデータはありません。', noEvents:'貢献履歴はありません。', noBadges:'獲得したバッジはありません。', privacy:'公開情報のみ表示されます。アカウントとセキュリティ設定は本人のみ管理できます。', loading:'読み込み中…', retry:'再読み込み', activityError:'貢献履歴を読み込めません', viewAll:'バッジを見る', created:'アカウント作成', bug:'有効なBug', suggestion:'提案採用', public:'公開プロフィール', unknown:'利用不可' },
}
const c = computed(() => words[locale.value] || words.en)
const section = computed(() => route.params.section || 'overview')
const mine = computed(() => !!auth.user && auth.user.username === user.value?.username)
const base = computed(() => `/u/${encodeURIComponent(user.value?.username || route.params.username)}`)
const tabs = ['overview','posts','collections','likes','following','followers','badges']
const icons = ['◈','▤','▧','♡','↗','◎','◇']
const website = computed(() => {
 try { const url = new URL(user.value?.website); return ['https:', 'http:'].includes(url.protocol) ? url.href : '' } catch { return '' }
})
function date(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(({zh:'zh-CN',en:'en-US',ja:'ja-JP'})[locale.value] || 'en-US') }
function reason(event) { return ({ ACCOUNT_CREATED:c.value.created, BUG_VALID:c.value.bug, SUGGESTION_ADOPTED:c.value.suggestion })[event.type] || c.value.contribution }
let requestId = 0
async function load() {
 const id = ++requestId
 loading.value = true; error.value = ''; user.value = null; events.value = []; activityError.value = false
 const username = route.params.username
 try {
  const profile = await api.user(username)
  if (id !== requestId) return
  user.value = profile.user
 } catch (e) { if (id === requestId) error.value = e.message }
 finally { if (id === requestId) loading.value = false }
 if (!user.value || id !== requestId) return
 try { const result = await api.contributions(username); if (id === requestId) events.value = result.events || [] }
 catch { if (id === requestId) activityError.value = true }
}
watch(() => route.params.username, load, { immediate:true })
</script>

<template>
 <div class="container"><SiteNav />
 <main class="space-main">
  <p v-if="loading" role="status" class="space-state">{{ c.loading }}</p>
  <div v-else-if="error" role="alert" class="space-state"><p>{{ error }}</p><button class="secondary-action" @click="load">{{ c.retry }}</button></div>
  <template v-else-if="user">
   <header class="space-hero">
    <div class="space-cover" aria-hidden="true"><span>YUASHIE / PERSONAL SPACE</span><b>IDENTITY<br>CONNECTED.</b><i>↗</i></div>
    <div class="space-identity">
     <div class="space-avatar"><img v-if="user.avatarUrl" :src="user.avatarUrl" alt=""><span v-else>{{ (user.displayName || user.username).slice(0,1).toUpperCase() }}</span></div>
     <div class="space-name"><small>{{ c.public }} · @{{ user.username }}</small><div><h1>{{ user.displayName || user.username }}</h1><span class="space-level">LV. {{ user.level ?? 1 }}</span><span v-if="user.equippedBadge" :title="user.equippedBadge.name">{{ user.equippedBadge.emoji }}</span></div><p>{{ user.bio || c.noBio }}</p>
      <div class="space-social"><RouterLink :to="`${base}/following`">— {{ c.following }}</RouterLink><RouterLink :to="`${base}/followers`">— {{ c.followers }}</RouterLink></div>
     </div>
     <RouterLink v-if="mine" class="secondary-action space-settings" to="/settings">{{ c.settings }} ↗</RouterLink>
    </div>
   </header>
   <div class="space-layout">
    <nav class="space-nav" :aria-label="c.title"><RouterLink v-for="(tab,index) in tabs" :key="tab" :to="tab === 'overview' ? base : `${base}/${tab}`" :class="{ selected:section === tab }" :aria-current="section === tab ? 'page' : undefined"><span aria-hidden="true">{{ icons[index] }}</span>{{ c[tab] }}<span aria-hidden="true">›</span></RouterLink><RouterLink v-if="mine" to="/settings"><span aria-hidden="true">⚙</span>{{ c.settings }}</RouterLink><p>{{ c.privacy }}</p></nav>
    <div class="space-content">
     <template v-if="section === 'overview'">
      <section class="space-panel"><div class="space-panel-head"><h2>{{ c.about }}</h2><span>01 / IDENTITY</span></div><dl class="space-details"><div><dt>{{ c.public }}</dt><dd>{{ user.displayName || user.username }}</dd></div><div><dt>{{ c.joined }}</dt><dd>{{ date(user.createdAt) }}</dd></div><div class="space-bio"><dt>{{ c.bio }}</dt><dd>{{ user.bio || c.noBio }}</dd></div><div v-if="website"><dt>{{ c.website }}</dt><dd><a :href="website" target="_blank" rel="noopener noreferrer nofollow">{{ c.website }} ↗</a></dd></div><div v-if="user.radioProfile?.callsign"><dt>RADIO</dt><dd><RouterLink :to="`/radio/${encodeURIComponent(user.radioProfile.callsign)}`">{{ user.radioProfile.callsign }} ↗</RouterLink></dd></div></dl></section>
      <div class="space-stats"><article class="space-panel"><small>{{ c.contribution }}</small><strong>{{ user.contributionPoints ?? 0 }}</strong><span>CONTRIBUTION</span></article><RouterLink class="space-panel" :to="`${base}/badges`"><small>{{ c.earned }}</small><strong>{{ user.badges?.length || 0 }}</strong><span>{{ c.viewAll }} ↗</span></RouterLink><article class="space-panel"><small>{{ c.posts }}</small><strong>—</strong><span>{{ c.unknown }}</span></article></div>
      <section class="space-panel"><div class="space-panel-head"><h2>{{ c.activity }}</h2><span>02 / ACTIVITY</span></div><div v-if="activityError" role="status" class="space-state">{{ c.activityError }} <button class="text-action" @click="load">{{ c.retry }}</button></div><ol v-else-if="events.length" class="space-timeline"><li v-for="(event,index) in events" :key="index"><div><strong>{{ reason(event) }}</strong><small>{{ date(event.createdAt) }}</small></div><b>{{ event.points > 0 ? '+' : '' }}{{ event.points }}</b></li></ol><p v-else class="space-state">{{ c.noEvents }}</p></section>
     </template>
     <section v-else-if="section === 'badges'" class="space-panel"><div class="space-panel-head"><h2>{{ c.badges }}</h2><span>COLLECTION</span></div><div v-if="user.badges?.length" class="space-badges"><article v-for="badge in user.badges" :key="badge.key"><span aria-hidden="true">{{ badge.emoji }}</span><h3>{{ badge.name }}</h3><small v-if="badge.awardedAt">{{ date(badge.awardedAt) }}</small></article></div><p v-else class="space-state">{{ c.noBadges }}</p></section>
     <section v-else class="space-panel"><div class="space-panel-head"><h2>{{ c[section] }}</h2></div><div class="space-state"><div class="space-empty-symbol" aria-hidden="true">◇</div><h3>{{ c.empty }}</h3><p>{{ c.unavailable }}</p></div></section>
    </div>
   </div>
  </template>
 </main><SiteFooter /></div>
</template>

<style scoped>
.space-main{padding:32px 0 80px;max-width:1240px;margin:auto;min-height:70vh}.space-hero{border:1px solid var(--line);background:var(--bg-soft);border-radius:20px;overflow:hidden;margin-bottom:24px}.space-cover{height:210px;position:relative;padding:24px 32px;overflow:hidden;background:linear-gradient(115deg,transparent,color-mix(in srgb,var(--accent-2) 20%,transparent)),repeating-linear-gradient(90deg,transparent 0 59px,var(--line) 60px),repeating-linear-gradient(0deg,transparent 0 39px,var(--line) 40px),var(--bg-soft)}.space-cover>span{font:11px monospace;letter-spacing:.2em;color:var(--muted)}.space-cover>b{display:block;font-size:46px;line-height:1;letter-spacing:-.05em;margin-top:25px;color:var(--accent);opacity:.65}.space-cover>i{position:absolute;right:40px;top:-65px;font-size:280px;color:var(--accent-2);opacity:.18}.space-identity{display:flex;gap:24px;align-items:flex-start;padding:0 32px 28px;position:relative}.space-avatar{margin-top:-35px;flex-shrink:0;width:112px;height:112px;border:5px solid var(--bg-soft);border-radius:25px;background:var(--bg);display:grid;place-items:center;font-size:42px;color:var(--accent);overflow:hidden}.space-avatar img{width:100%;height:100%;object-fit:cover}.space-name{padding-top:20px;min-width:0;flex:1}.space-name>small{color:var(--muted);font-size:12px}.space-name>div:first-of-type{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.space-name h1{font-size:32px;margin:8px 0;overflow-wrap:anywhere}.space-name p{margin:4px 0 16px;color:var(--muted);white-space:pre-wrap;overflow-wrap:anywhere}.space-level{font:12px monospace;border:1px solid var(--line);border-radius:6px;padding:5px 8px;color:var(--accent)}.space-social{display:flex;gap:24px;font-size:13px}.space-settings{margin-top:26px}.space-layout{display:grid;grid-template-columns:215px minmax(0,1fr);gap:24px;align-items:start}.space-nav,.space-panel{border:1px solid var(--line);border-radius:16px;background:color-mix(in srgb,var(--bg-soft) 94%,transparent)}.space-nav{height:auto;min-height:0;margin:0;justify-content:flex-start;display:flex;flex-direction:column;align-items:stretch;min-width:0;padding:12px;position:sticky;top:100px}.space-nav>a{display:flex;align-items:center;gap:12px;padding:15px 14px;border-radius:9px;color:var(--muted);font-size:14px}.space-nav>a>span:last-child{margin-left:auto}.space-nav>a.selected{color:var(--accent);background:color-mix(in srgb,var(--accent) 9%,transparent);box-shadow:inset 3px 0 var(--accent)}.space-nav>a:hover{color:var(--text);background:var(--line)}.space-nav p{font-size:11px;line-height:1.8;color:var(--muted);padding:16px 12px 0;border-top:1px solid var(--line)}.space-content{display:grid;gap:20px;min-width:0}.space-panel{padding:26px}.space-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:24px}.space-panel h2{font-size:17px;margin:0}.space-panel-head>span{font:10px monospace;letter-spacing:.12em;color:var(--muted)}.space-details{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin:0}.space-details dt{font-size:12px;color:var(--muted);margin-bottom:9px}.space-details dd{margin:0;overflow-wrap:anywhere;font-size:16px}.space-bio{grid-column:1/-1;border-top:1px solid var(--line);padding-top:24px;white-space:pre-wrap}.space-details a{color:var(--accent)}.space-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.space-stats .space-panel{display:flex;flex-direction:column;gap:12px}.space-stats small{color:var(--muted)}.space-stats strong{font-size:36px;font-weight:500}.space-stats span{font:10px monospace;color:var(--accent)}.space-timeline{padding:0;list-style:none;margin:0}.space-timeline li{display:flex;justify-content:space-between;gap:16px;padding:18px 0;border-top:1px solid var(--line)}.space-timeline small{display:block;color:var(--muted);font-size:11px;margin-top:8px}.space-timeline b{color:var(--accent);font:18px monospace}.space-state{padding:38px 12px;text-align:center;color:var(--muted);line-height:1.8}.space-empty-symbol{font-size:50px;color:var(--accent-2)}.space-badges{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px}.space-badges article{padding:24px;border:1px solid var(--line);border-radius:12px;text-align:center}.space-badges article>span{font-size:36px}.space-badges h3{font-size:14px}.space-badges small{color:var(--muted)}
@media(max-width:800px){.space-layout{grid-template-columns:1fr}.space-nav{position:static;display:flex;flex-direction:row;overflow:auto;gap:5px}.space-nav>a{flex-shrink:0;padding:12px}.space-nav p,.space-nav>a>span:last-child{display:none}.space-nav>a.selected{box-shadow:inset 0 -2px var(--accent)}.space-identity{padding:0 20px 24px;gap:16px;flex-wrap:wrap}.space-avatar{width:85px;height:85px}.space-name h1{font-size:25px}.space-settings{margin:0 0 0 auto}.space-cover{height:170px;padding:20px}.space-cover>b{font-size:36px}.space-main{padding-top:20px}.space-panel{padding:20px}.space-stats{gap:10px}.space-stats .space-panel{padding:16px}.space-stats strong{font-size:28px}}
@media(max-width:420px){.space-details{grid-template-columns:1fr}.space-panel-head>span{display:none}.space-stats{grid-template-columns:1fr}.space-stats .space-panel{display:grid;grid-template-columns:1fr auto;align-items:center}.space-stats span{grid-column:1/-1}.space-name{flex-basis:60%}}
</style>
