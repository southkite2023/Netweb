<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import RadioSubnav from '../components/RadioSubnav.vue'
import { api } from '../lib/api'

const route=useRoute(); const {locale}=useI18n(); const data=ref(null); const error=ref('')
const copy=computed(()=>({
 zh:{kicker:'// PUBLIC RADIO STATION',class:'操作类别',verified:'已验证',unverified:'已绑定 · 未验证',qso:'QSO',sent:'QSL 已发',received:'QSL 已收',qth:'QTH',rig:'设备',antenna:'天线',power:'默认功率',bio:'电台简介',recent:'最近通联',user:'网站用户',date:'日期',time:'时间（BJT）',remote:'对方呼号',freq:'频率',mode:'模式',rst:'RST'},
 en:{kicker:'// PUBLIC RADIO STATION',class:'OPERATOR CLASS',verified:'VERIFIED',unverified:'BOUND · UNVERIFIED',qso:'QSO',sent:'QSL SENT',received:'QSL RECEIVED',qth:'QTH',rig:'RIG',antenna:'ANTENNA',power:'DEFAULT POWER',bio:'RADIO BIO',recent:'RECENT QSO',user:'YUASHIE USER',date:'DATE',time:'TIME (BJT)',remote:'REMOTE CALL',freq:'FREQ',mode:'MODE',rst:'RST'},
 ja:{kicker:'// PUBLIC RADIO STATION',class:'操作クラス',verified:'認証済み',unverified:'登録済み · 未認証',qso:'QSO',sent:'QSL送信',received:'QSL受信',qth:'QTH',rig:'無線機',antenna:'アンテナ',power:'既定出力',bio:'無線プロフィール',recent:'最近のQSO',user:'YUASHIEユーザー',date:'日付',time:'時刻（BJT）',remote:'相手局',freq:'周波数',mode:'モード',rst:'RST'}
}[locale.value]))
async function load(){error.value='';data.value=null;try{data.value=await api.radioStation(route.params.callsign)}catch(e){error.value=e.message}}
onMounted(load);watch(()=>route.params.callsign,load)
</script>
<template><div class="radio-page"><div class="container"><SiteNav/><RadioSubnav/><main class="radio-main"><p v-if="error" class="form-error">{{error}}</p><template v-if="data">
<header class="public-radio-hero"><div><p class="auth-kicker">{{copy.kicker}}</p><h1>📻 {{data.profile.callsign}}</h1><div class="public-radio-tags"><span>CLASS {{data.profile.operatorClass}}</span><span>{{data.profile.verificationStatus==='verified'?copy.verified:copy.unverified}}</span><span>{{data.profile.callsignCountry}}</span></div></div><RouterLink class="public-radio-user" :to="`/u/${data.user.username}`"><span>{{copy.user}}</span><strong>{{data.user.displayName}}</strong><small>@{{data.user.username}}</small></RouterLink></header>
<section class="radio-stat-grid"><article><span>{{copy.qso}}</span><strong>{{data.stats.qsoCount}}</strong></article><article><span>{{copy.sent}}</span><strong>{{data.stats.qslSentCount}}</strong></article><article><span>{{copy.received}}</span><strong>{{data.stats.qslReceivedCount}}</strong></article><article><span>{{copy.class}}</span><strong>{{data.profile.operatorClass}}</strong></article></section>
<section class="public-radio-info"><div><span>{{copy.qth}}</span><strong>{{data.profile.qth||'—'}}</strong></div><div><span>{{copy.rig}}</span><strong>{{data.profile.rig||'—'}}</strong></div><div><span>{{copy.antenna}}</span><strong>{{data.profile.antenna||'—'}}</strong></div><div><span>{{copy.power}}</span><strong>{{data.profile.defaultPowerW==null?'—':data.profile.defaultPowerW+' W'}}</strong></div><div class="wide"><span>{{copy.bio}}</span><p>{{data.profile.bio||'—'}}</p></div></section>
<section class="radio-section"><div class="radio-section-head"><span>QSO / PUBLIC LOG</span><h2>{{copy.recent}}</h2></div><div v-if="data.recentQsos.length" class="radio-table-wrap"><table class="radio-table"><thead><tr><th>{{copy.date}}</th><th>{{copy.time}}</th><th>{{copy.remote}}</th><th>{{copy.freq}}</th><th>{{copy.mode}}</th><th>{{copy.rst}}</th></tr></thead><tbody><tr v-for="item in data.recentQsos" :key="item.id"><td>{{item.date}}</td><td>{{item.time.slice(0,5)}}</td><td><strong>{{item.remoteCallsign}}</strong></td><td>{{item.frequencyMHz.toFixed(3)}} MHz</td><td>{{item.mode}}</td><td>{{item.rstSent||'—'}} / {{item.rstReceived||'—'}}</td></tr></tbody></table></div><p v-else class="comment-empty">—</p></section>
</template></main></div><SiteFooter/></div></template>
