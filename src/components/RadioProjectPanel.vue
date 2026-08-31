<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
const { locale } = useI18n()
const copy = computed(() => ({
  zh: { label:'PROJECT 003 / LIVE SYSTEM', title:'进入 Yuashie Radio', text:'绑定呼号、建立 📻 身份、记录 QSO、上传自己的 QSL 设计，并向本站其他已绑定呼号的用户发送电子 QSL。', enter:'进入无线电台', features:['呼号与 A / B / C 类别','完整 QSO 通联日志','自定义 QSL 模板','站内电子 QSL 收发'] },
  en: { label:'PROJECT 003 / LIVE SYSTEM', title:'Enter Yuashie Radio', text:'Bind a callsign, establish your 📻 identity, log QSOs, upload your own QSL artwork, and send electronic QSL cards to other bound operators on Yuashie.', enter:'ENTER RADIO', features:['Callsign + A / B / C class','Full QSO logbook','Custom QSL templates','In-site electronic QSL'] },
  ja: { label:'PROJECT 003 / LIVE SYSTEM', title:'Yuashie Radioへ', text:'コールサインと📻無線IDを登録し、QSOを記録、自作QSLをアップロードし、Yuashie内の他局へ電子QSLを送信できます。', enter:'無線システムへ', features:['コールサイン・A/B/Cクラス','完全なQSOログ','自作QSLテンプレート','サイト内eQSL送受信'] },
}[locale.value]))
</script>
<template><section class="radio-project-panel"><div><span>{{copy.label}}</span><h2>{{copy.title}}</h2><p>{{copy.text}}</p><ul><li v-for="item in copy.features" :key="item">{{item}}</li></ul></div><RouterLink class="primary-action" to="/radio">{{copy.enter}} →</RouterLink></section></template>
