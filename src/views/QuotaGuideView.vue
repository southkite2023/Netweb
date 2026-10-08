<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { quotaCopy, quotaRelease } from '../data/quotaHub'
import '../quota-hub.css'
const { locale } = useI18n()
const c = computed(() => quotaCopy[locale.value] || quotaCopy.zh)
</script>
<template>
  <div class="quota-page">
    <div class="container"><SiteNav /></div>
    <main class="quota-guide">
      <RouterLink class="quota-back" to="/projects/001/download">← {{ c.returnDownload }}</RouterLink>
      <header><p class="quota-eyebrow">ASTRACCT / GUIDE / {{ quotaRelease.version }}</p><h1>{{ c.guideTitle }}</h1><p class="quota-intro">{{ c.guideIntro }}</p></header>
      <ol class="quota-steps"><li v-for="(step, index) in c.steps" :key="step[0]"><span aria-hidden="true">0{{ index + 1 }}</span><div><h2>{{ step[0] }}</h2><p>{{ step[1] }}</p></div></li></ol>
      <aside class="quota-update"><h2>{{ c.updateTitle }}</h2><p>{{ c.update }}</p><p>{{ c.testNote }}</p><a :href="quotaRelease.url" target="_blank" rel="noopener noreferrer">{{ c.notes }} ↗</a></aside>
      <p class="quota-fineprint">{{ c.limits }}</p>
      <RouterLink class="quota-primary" to="/projects/001/download">{{ c.returnDownload }} →</RouterLink>
    </main>
    <SiteFooter />
  </div>
</template>

