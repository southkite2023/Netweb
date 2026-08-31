<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import RadioSubnav from '../components/RadioSubnav.vue'
import { api } from '../lib/api'

const { locale } = useI18n()
const logs = ref([]); const templates = ref([]); const selectedTemplate = ref(''); const q = ref(''); const error=ref(''); const notice=ref(''); const busy=ref('')
const copy = computed(()=>({
 zh:{kicker:'// QSO LOGBOOK',title:'通联日志',intro:'保存、检索并管理你的通联记录。表格字段对应日期、呼号、BJT 时间、频率、模式、RST、功率、QTH、设备、天线、摘要与 QSL 状态。',search:'搜索呼号 / 模式 / QTH / 摘要',add:'新增 QSO',defaultQsl:'发送时使用',noQsl:'尚未上传 QSL',manageQsl:'管理 QSL',empty:'还没有通联记录。',date:'日期',time:'时间',call:'呼号',freq:'频率',mode:'模式',rst:'RST 己/对',power:'功率 己/对',qth:'QTH',rig:'设备',antenna:'天线',notes:'摘要',qsl:'QSL',actions:'操作',edit:'编辑',remove:'删除',send:'发送 eQSL',sent:'电子 QSL 已发送。',confirmDelete:'确定删除这条 QSO 记录吗？'},
 en:{kicker:'// QSO LOGBOOK',title:'QSO Log',intro:'Store, search, and manage your contacts with date, callsign, BJT time, frequency, mode, RST, power, QTH, rig, antenna, notes, and QSL status.',search:'Search callsign / mode / QTH / notes',add:'NEW QSO',defaultQsl:'QSL FOR SENDING',noQsl:'No QSL uploaded',manageQsl:'MANAGE QSL',empty:'No QSO records yet.',date:'DATE',time:'TIME',call:'CALLSIGN',freq:'FREQ',mode:'MODE',rst:'RST S/R',power:'POWER S/R',qth:'QTH',rig:'RIG',antenna:'ANTENNA',notes:'NOTES',qsl:'QSL',actions:'ACTIONS',edit:'EDIT',remove:'DELETE',send:'SEND eQSL',sent:'Electronic QSL sent.',confirmDelete:'Delete this QSO record?'},
 ja:{kicker:'// QSO LOGBOOK',title:'QSOログ',intro:'日付、コールサイン、BJT時刻、周波数、モード、RST、出力、QTH、無線機、アンテナ、摘要、QSL状態を保存・検索・管理します。',search:'コールサイン / モード / QTH / 摘要を検索',add:'QSO追加',defaultQsl:'送信QSL',noQsl:'QSL未登録',manageQsl:'QSL管理',empty:'QSO記録はまだありません。',date:'日付',time:'時刻',call:'コールサイン',freq:'周波数',mode:'モード',rst:'RST 自/相',power:'出力 自/相',qth:'QTH',rig:'無線機',antenna:'アンテナ',notes:'摘要',qsl:'QSL',actions:'操作',edit:'編集',remove:'削除',send:'eQSL送信',sent:'電子QSLを送信しました。',confirmDelete:'このQSO記録を削除しますか？'}
}[locale.value]))

async function load(){error.value='';try{const [l,t]=await Promise.all([api.radioLogs(q.value),api.qslTemplates()]);logs.value=l.logs;templates.value=t.templates;if(!templates.value.some(x=>String(x.id)===String(selectedTemplate.value)))selectedTemplate.value=String(templates.value.find(x=>x.isDefault)?.id||templates.value[0]?.id||'')}catch(e){error.value=e.message}}
async function search(){const r=await api.radioLogs(q.value).catch(e=>{error.value=e.message;return null});if(r)logs.value=r.logs}
async function remove(item){if(!confirm(copy.value.confirmDelete))return;busy.value=`d${item.id}`;try{await api.deleteRadioLog(item.id);logs.value=logs.value.filter(x=>x.id!==item.id)}catch(e){error.value=e.message}finally{busy.value=''}}
async function send(item){if(!selectedTemplate.value){error.value=copy.value.noQsl;return}busy.value=`s${item.id}`;error.value='';notice.value='';try{await api.sendQsl({qsoId:item.id,templateId:Number(selectedTemplate.value)});item.qslSent=true;notice.value=copy.value.sent}catch(e){error.value=e.message}finally{busy.value=''}}
onMounted(load)
</script>

<template><div class="radio-page"><div class="container"><SiteNav/><RadioSubnav/><main class="radio-main">
<header class="radio-hero compact"><p class="auth-kicker">{{copy.kicker}}</p><h1>{{copy.title}}</h1><p>{{copy.intro}}</p></header>
<p v-if="error" class="form-error">{{error}}</p><p v-if="notice" class="form-success">{{notice}}</p>
<section class="radio-log-toolbar"><form @submit.prevent="search"><input v-model="q" :placeholder="copy.search"><button class="secondary-action" type="submit">SEARCH</button></form><div class="radio-toolbar-actions"><label><span>{{copy.defaultQsl}}</span><select v-if="templates.length" v-model="selectedTemplate"><option v-for="item in templates" :key="item.id" :value="String(item.id)">{{item.name}}{{item.isDefault?' · DEFAULT':''}}</option></select><RouterLink v-else to="/radio/qsl">{{copy.noQsl}} →</RouterLink></label><RouterLink class="secondary-action" to="/radio/qsl">{{copy.manageQsl}}</RouterLink><RouterLink class="primary-action" to="/radio/log/new">{{copy.add}} →</RouterLink></div></section>
<div v-if="logs.length" class="radio-table-wrap radio-log-table-wrap"><table class="radio-table radio-log-table"><thead><tr><th>{{copy.date}}</th><th>{{copy.time}}</th><th>{{copy.call}}</th><th>{{copy.freq}}</th><th>{{copy.mode}}</th><th>{{copy.rst}}</th><th>{{copy.power}}</th><th>{{copy.qth}}</th><th>{{copy.rig}}</th><th>{{copy.antenna}}</th><th>{{copy.notes}}</th><th>{{copy.qsl}}</th><th>{{copy.actions}}</th></tr></thead><tbody>
<tr v-for="item in logs" :key="item.id"><td>{{item.date}}</td><td>{{item.time.slice(0,5)}}</td><td><strong>{{item.remoteCallsign}}</strong></td><td>{{item.frequencyMHz.toFixed(3)}}</td><td>{{item.mode}}</td><td>{{item.rstSent||'—'}} / {{item.rstReceived||'—'}}</td><td>{{item.powerSentW??'—'}} / {{item.powerReceivedW??'—'}}</td><td>{{item.qth||'—'}}</td><td>{{item.rig||'—'}}</td><td>{{item.antenna||'—'}}</td><td class="radio-notes-cell">{{item.notes||'—'}}</td><td><span class="qsl-flags" :title="`Requested ${item.qslRequested}; Sent ${item.qslSent}; Received ${item.qslReceived}`"><b :class="{on:item.qslRequested}">N</b><b :class="{on:item.qslSent}">S</b><b :class="{on:item.qslReceived}">R</b></span></td><td><div class="radio-row-actions"><RouterLink :to="`/radio/log/${item.id}/edit`">{{copy.edit}}</RouterLink><button :disabled="busy===`s${item.id}`||item.qslSent" @click="send(item)">{{item.qslSent?'QSL ✓':copy.send}}</button><button :disabled="busy===`d${item.id}`" @click="remove(item)">{{copy.remove}}</button></div></td></tr>
</tbody></table></div><p v-else class="comment-empty">{{copy.empty}}</p>
</main></div><SiteFooter/></div></template>
