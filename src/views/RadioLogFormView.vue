<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
    if (!radio.profile) { router.replace('/radio/station'); return }
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
    router.push('/radio/log')
  }catch(e){error.value=e.message}finally{busy.value=false}
}
onMounted(load)
</script>

<template>
<div class="radio-page"><div class="container"><SiteNav/><RadioSubnav/><main class="radio-main radio-form-main">
<header class="radio-hero compact"><p class="auth-kicker">{{copy.kicker}}</p><h1>{{copy.title}}</h1><p>{{copy.intro}}</p></header>
<p v-if="error" class="form-error">{{error}}</p>
<form class="radio-form-panel" @submit.prevent="save">
<section class="radio-fieldset"><h2>{{copy.basic}}</h2><div class="radio-form-grid">
<label><span>{{copy.call}}</span><input v-model.trim="form.remoteCallsign" maxlength="20" required placeholder="JA1XXX" @input="form.remoteCallsign=form.remoteCallsign.toUpperCase()"></label>
<label><span>{{copy.date}}</span><input v-model="form.date" type="date" required></label>
<label><span>{{copy.time}}</span><input v-model="form.time" type="time" required></label>
<label><span>{{copy.freq}}</span><input v-model="form.frequencyMHz" type="number" min="0.000001" step="0.000001" required placeholder="14.270"></label>
<label><span>{{copy.mode}}</span><select v-model="form.mode"><option v-for="mode in modes" :key="mode" :value="mode">{{mode}}</option><option value="OTHER">OTHER</option></select></label>
<label v-if="form.mode==='OTHER'"><span>{{copy.custom}}</span><input v-model.trim="customMode" maxlength="20" required placeholder="FREEDV"></label>
</div></section>
<section class="radio-fieldset"><h2>{{copy.signal}}</h2><div class="radio-form-grid">
<label><span>{{copy.rstS}}</span><input v-model.trim="form.rstSent" maxlength="12" placeholder="59"></label><label><span>{{copy.rstR}}</span><input v-model.trim="form.rstReceived" maxlength="12" placeholder="59"></label>
<label><span>{{copy.powerS}}</span><input v-model="form.powerSentW" type="number" min="0" step="0.1" placeholder="20"></label><label><span>{{copy.powerR}}</span><input v-model="form.powerReceivedW" type="number" min="0" step="0.1" placeholder="100"></label>
</div></section>
<section class="radio-fieldset"><h2>{{copy.station}}</h2><div class="radio-form-grid">
<label><span>{{copy.qth}}</span><input v-model="form.qth" maxlength="120"></label><label><span>{{copy.rig}}</span><input v-model="form.rig" maxlength="120"></label><label class="wide"><span>{{copy.antenna}}</span><input v-model="form.antenna" maxlength="160"></label><label class="wide"><span>{{copy.notes}}</span><textarea v-model="form.notes" maxlength="1000" rows="5"></textarea></label>
</div></section>
<section class="radio-fieldset"><h2>{{copy.card}}</h2><div class="radio-check-grid"><label><input v-model="form.qslRequested" type="checkbox">{{copy.requested}}</label><label><input v-model="form.qslSent" type="checkbox">{{copy.sent}}</label><label><input v-model="form.qslReceived" type="checkbox">{{copy.received}}</label></div></section>
<div class="radio-form-actions"><button class="primary-action" :disabled="busy" type="submit">{{copy.save}}</button><RouterLink class="secondary-action" to="/radio/log">{{copy.cancel}}</RouterLink></div>
</form></main></div><SiteFooter/></div>
</template>
