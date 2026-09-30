<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { quotaCopy, quotaRelease } from '../data/quotaHub'
import '../quota-hub.css'
const { locale } = useI18n()
const c = computed(() => quotaCopy[locale.value] || quotaCopy.zh)
</script>

<template>
  <section class="quota-page quota-project">
    <div class="quota-kicker"><span>PROJECT / 001</span><span>{{ c.badge }} · {{ quotaRelease.version }}</span></div>
    <div class="quota-project-grid">
      <header>
        <p class="quota-wordmark"><span class="quota-symbol" aria-hidden="true">Q</span> Quota Hub</p>
        <h1>{{ c.headline[0] }}<br><span>{{ c.headline[1] }}</span></h1>
        <p class="quota-intro">{{ c.intro }}</p>
        <RouterLink class="quota-primary" to="/projects/001/download">{{ c.open }} <span aria-hidden="true">↗</span></RouterLink>
      </header>
      <div class="quota-diagram">
        <div class="quota-orbit" aria-hidden="true"></div>
        <div class="quota-diagram-hub"><span class="quota-symbol" aria-hidden="true">Q</span><strong>Quota Hub</strong></div>
        <div v-for="(account, index) in c.accounts" :key="account" class="quota-account"><span class="quota-account-index">0{{ index + 1 }}</span><strong>{{ account }}</strong><span aria-hidden="true">↗</span></div>
        <p>{{ c.preview }}</p>
      </div>
    </div>
    <div class="quota-features"><article v-for="(feature, index) in c.features" :key="feature[0]"><span>0{{ index + 1 }}</span><h2>{{ feature[0] }}</h2><p>{{ feature[1] }}</p></article></div>
    <p class="quota-fineprint">{{ c.limits }}</p>
  </section>
</template>
