<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PrivacyNotice from '../components/PrivacyNotice.vue'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import RadioSubnav from '../components/RadioSubnav.vue'
import { api } from '../lib/api'

const route = useRoute(); const router = useRouter(); const { locale } = useI18n()
const error = ref(''); const busy = ref(false); const editing = computed(() => Boolean(route.params.id))
const modes = ['CW','SSB','USB','LSB','FM','AM','FT8','FT4','RTTY','PSK31','SSTV','JS8','DMR','C4FM','D-STAR']
const customMode = ref('')

function bjtNow() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Shanghai', year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]))
  return { date:`${parts.year}-${parts.month}-${parts.day}`, time:`${parts.hour}:${parts.minute}` }
}
const now = bjtNow()
const form = ref({ remoteCallsign:'', date:now.date, time:now.time, frequencyMHz:'', mode:'SSB', rstSent:'59', rstReceived:'59', powerSentW:'', powerReceivedW:'', qth:'', rig:'', antenna:'', notes:'', qslRequested:false, qslSent:false, qslReceived:false })
const copy = computed(() => ({
  zh:{kicker:'// QSO LOG ENTRY',title:editing.value?'编辑通联记录':'记录一次通联',intro:'时间按 BJT（UTC+8）记录。字段结构对应你的纸质/表格日志，并为后续 ADIF 导入导出预留结构。',basic:'基本信息',signal:'信号与功率',station:'电台信息',card:'QSL 状态',call:'对方呼号',date:'日期',time:'时间（BJT）',freq:'频率（MHz）',mode:'模式',custom:'自定义模式',rstS:'RST 己方',rstR:'RST 对方',powerS:'功率 己方（W）',powerR:'功率 对方（W）',qth:'电台 QTH',rig:'设备',antenna:'天线',notes:'摘要',requested:'需要 QSL',sent:'已发 QSL',received:'已收 QSL',save:'保存通联记录',cancel:'返回日志'},
  en:{kicker:'// QSO LOG ENTRY',title:editing.value?'Edit QSO':'Log a QSO',intro:'Time is stored in BJT (UTC+8). The structure mirrors the paper/table log and keeps room for future ADIF import/export.',basic:'BASIC',signal:'SIGNAL & POWER',station:'STATION',card:'QSL STATUS',call:'Remote callsign',date:'Date',time:'Time (BJT)',freq:'Frequency (MHz)',mode:'Mode',custom:'Custom mode',rstS:'RST sent',rstR:'RST received',powerS:'My power (W)',powerR:'Their power (W)',qth:'Station QTH',rig:'Rig',antenna:'Antenna',notes:'Notes',requested:'QSL requested',sent:'QSL sent',received:'QSL received',save:'SAVE QSO',cancel:'BACK TO LOG'},
  ja:{kicker:'// QSO LOG ENTRY',title:editing.value?'QSOを編集':'QSOを記録',intro:'時刻はBJT（UTC+8）で記録します。紙・表計算ログの構造を保ち、将来のADIF入出力にも対応しやすい設計です。',basic:'基本情報',signal:'信号・出力',station:'無線局情報',card:'QSL状態',call:'相手コールサイン',date:'日付',time:'時刻（BJT）',freq:'周波数（MHz）',mode:'モード',custom:'カスタムモード',rstS:'RST 送信',rstR:'RST 受信',powerS:'自局出力（W）',powerR:'相手出力（W）',qth:'局QTH',rig:'無線機',antenna:'アンテナ',notes:'摘要',requested:'QSL必要',sent:'QSL送信済み',received:'QSL受信済み',save:'QSOを保存',cancel:'ログへ戻る'}
}[locale.value]))

async function load() {
  error.value=''
  try {
    const radio = await api.radioMe()
    if (!radio.profile) { router.replace('/003/radio/station'); return }
    if (!editing.value) {
      form.value.qth = radio.profile.qth || ''; form.value.rig = radio.profile.rig || ''; form.value.antenna = radio.profile.antenna || ''; form.value.powerSentW = radio.profile.defaultPowerW ?? ''
      return
    }
    const { log } = await api.radioLog(route.params.id)
    const modeKnown = modes.includes(log.mode)
    form.value = { ...log, time: log.time.slice(0,5), mode: modeKnown ? log.mode : 'OTHER', frequencyMHz:String(log.frequencyMHz), powerSentW:log.powerSentW ?? '', powerReceivedW:log.powerReceivedW ?? '' }
    if (!modeKnown) customMode.value = log.mode
  } catch(e){ error.value=e.message }
}
async function save(){
  busy.value=true;error.value=''
  try{
    const payload={...form.value, mode:form.value.mode==='OTHER'?customMode.value:form.value.mode}
    if(editing.value) await api.updateRadioLog(route.params.id,payload); else await api.createRadioLog(payload)
    router.push('/003/radio/log')
  }catch(e){error.value=e.message}finally{busy.value=false}
}
onMounted(load)
</script>

<template>
<div class="radio-page radio-qso-page"><div class="container"><SiteNav/><RadioSubnav/><main class="radio-main radio-form-main radio-qso-main">
<header class="radio-hero compact"><p class="auth-kicker">{{copy.kicker}}</p><h1>{{copy.title}}</h1><p>{{copy.intro}}</p></header>
<PrivacyNotice kind="radioLog" />
<p v-if="error" class="form-error">{{error}}</p>
<form class="radio-form-panel" @submit.prevent="save">
<section class="radio-fieldset qso-basic"><h2>{{copy.basic}}</h2><div class="radio-form-grid">
<label><span>{{copy.call}}</span><input v-model.trim="form.remoteCallsign" maxlength="20" required placeholder="JA1XXX" @input="form.remoteCallsign=form.remoteCallsign.toUpperCase()"></label>
<label><span>{{copy.date}}</span><input v-model="form.date" type="date" required></label>
<label><span>{{copy.time}}</span><input v-model="form.time" type="time" required></label>
<label><span>{{copy.freq}}</span><input v-model="form.frequencyMHz" type="number" min="0.000001" step="0.000001" required placeholder="14.270"></label>
<label><span>{{copy.mode}}</span><select v-model="form.mode"><option v-for="mode in modes" :key="mode" :value="mode">{{mode}}</option><option value="OTHER">OTHER</option></select></label>
<label v-if="form.mode==='OTHER'"><span>{{copy.custom}}</span><input v-model.trim="customMode" maxlength="20" required placeholder="FREEDV"></label>
</div></section>
<section class="radio-fieldset qso-signal"><h2>{{copy.signal}}</h2><div class="radio-form-grid">
<label><span>{{copy.rstS}}</span><input v-model.trim="form.rstSent" maxlength="12" placeholder="59"></label><label><span>{{copy.rstR}}</span><input v-model.trim="form.rstReceived" maxlength="12" placeholder="59"></label>
<label><span>{{copy.powerS}}</span><input v-model="form.powerSentW" type="number" min="0" step="0.1" placeholder="20"></label><label><span>{{copy.powerR}}</span><input v-model="form.powerReceivedW" type="number" min="0" step="0.1" placeholder="100"></label>
</div></section>
<section class="radio-fieldset qso-station"><h2>{{copy.station}}</h2><div class="radio-form-grid">
<label><span>{{copy.qth}}</span><input v-model="form.qth" maxlength="120"></label><label><span>{{copy.rig}}</span><input v-model="form.rig" maxlength="120"></label><label><span>{{copy.antenna}}</span><input v-model="form.antenna" maxlength="160"></label><label class="wide"><span>{{copy.notes}}</span><textarea v-model="form.notes" maxlength="1000" rows="2"></textarea></label>
</div></section>
<section class="radio-fieldset"><h2>{{copy.card}}</h2><div class="radio-check-grid"><label><input v-model="form.qslRequested" type="checkbox">{{copy.requested}}</label><label><input v-model="form.qslSent" type="checkbox">{{copy.sent}}</label><label><input v-model="form.qslReceived" type="checkbox">{{copy.received}}</label></div></section>
<div class="radio-form-actions"><button class="primary-action" :disabled="busy" type="submit">{{copy.save}}</button><RouterLink class="secondary-action" to="/003/radio/log">{{copy.cancel}}</RouterLink></div>
</form></main></div><SiteFooter/></div>
</template>

<style scoped>
/* Keep the complete QSO entry within a typical desktop viewport. */
.radio-qso-page {
  --glass-surface: rgba(26, 32, 35, .62);
  --glass-border: rgba(210, 231, 220, .16);
  --glass-highlight: rgba(255, 255, 255, .07);
  background: radial-gradient(ellipse at 10% 30%, rgba(181, 228, 129, .09), transparent 60%), var(--bg);
}
:root[data-theme="light"] .radio-qso-page {
  --glass-surface: rgba(255, 255, 255, .62);
  --glass-border: rgba(65, 90, 72, .18);
  --glass-highlight: rgba(255, 255, 255, .65);
}
.radio-qso-main { max-width: 1160px; min-height: 0; padding: 16px 0 24px; }
.radio-hero.compact { max-width: none; margin-bottom: 12px; }
.radio-hero.compact h1 { font-size: 30px; line-height: 1.2; letter-spacing: -.03em; margin: 5px 0 6px; }
.radio-hero.compact > p:not(.auth-kicker) { max-width: none; font-size: 12px; line-height: 1.5; }
.auth-kicker { font-size: 9px; }
.radio-qso-main :deep(.privacy-notice) { margin: 0 0 12px; padding: 9px 12px; gap: 10px; font-size: 11px; line-height: 1.5; }
.radio-qso-main :deep(.privacy-notice p) { margin: 0; font-size: inherit; line-height: inherit; }
.radio-qso-main :deep(.privacy-notice a) { padding: 0; font-size: 10px; }
.form-error { margin: 0 0 8px; padding: 5px 10px; font-size: 11px; }
.radio-form-panel { padding: 14px 18px; background: var(--glass-surface); -webkit-backdrop-filter: blur(22px) saturate(145%); backdrop-filter: blur(22px) saturate(145%); }
.radio-fieldset { padding: 8px 0; }
.radio-fieldset h2 { font-size: 10px; margin-bottom: 8px; }
.radio-form-grid { gap: 8px 12px; }
.qso-basic .radio-form-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.qso-signal .radio-form-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.qso-station .radio-form-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.radio-form-grid label { min-width: 0; gap: 4px; font-size: 10px; letter-spacing: .03em; }
.radio-form-grid input, .radio-form-grid select, .radio-form-grid textarea { min-width: 0; min-height: 32px; height: 32px; padding: 5px 9px; font-family: inherit; font-size: 12px; line-height: 1.5; }
.radio-form-grid textarea { height: 44px; min-height: 44px; resize: vertical; }
.radio-check-grid { gap: 10px 22px; }
.radio-check-grid label { font-size: 12px; gap: 6px; }
.radio-check-grid input { width: 15px; height: 15px; }
.radio-form-actions { margin-top: 8px; gap: 8px; }
.radio-form-actions .primary-action, .radio-form-actions .secondary-action { min-height: 34px; padding: 7px 14px; font-size: 12px; }
@media (min-width: 1001px) {
  .radio-fieldset { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 12px; align-items: start; }
  .radio-fieldset h2 { padding-top: 4px; margin: 0; }
  .radio-qso-main :deep(.privacy-notice) { display: flex; align-items: center; }
  .radio-qso-main :deep(.privacy-notice a) { flex-shrink: 0; }
}
@media (max-width: 1000px) {
  .qso-basic .radio-form-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 600px) {
  .radio-qso-main { padding-top: 16px; }
  .radio-hero.compact h1 { font-size: 26px; }
  .radio-form-panel { padding: 14px; }
  .qso-basic .radio-form-grid, .qso-signal .radio-form-grid, .qso-station .radio-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .radio-form-grid label.wide { grid-column: 1 / -1; }
  .radio-form-grid input, .radio-form-grid select { height: 36px; min-height: 36px; font-size: 16px; }
  .radio-form-grid textarea { font-size: 16px; }
  .radio-check-grid { display: flex; flex-wrap: wrap; gap: 10px 14px; }
  .radio-form-actions { display: grid; grid-template-columns: 1fr 1fr; }
  .radio-form-actions > * { justify-content: center; }
}
</style>
