<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { calendarCopy } from '../data/calendar'
import '../quota-hub.css'
import '../calendar.css'
const { locale } = useI18n()
const c = computed(() => calendarCopy[locale.value] || calendarCopy.zh)
</script>

<template>
  <section class="quota-page quota-project calendar-page">
    <div class="quota-kicker"><span>PROJECT / 004</span><span>{{ c.badge }}</span></div>
    <div class="quota-project-grid">
      <header>
        <p class="quota-wordmark"><span class="quota-symbol" aria-hidden="true">C</span> Yuashie Calendar</p>
        <h1>{{ c.headline[0] }}<br><span>{{ c.headline[1] }}</span></h1>
        <p class="quota-intro">{{ c.intro }}</p>
        <RouterLink class="quota-primary" to="/projects/004/subscribe">{{ c.open }} <span aria-hidden="true">↗</span></RouterLink>
      </header>
      <div class="quota-diagram">
        <div class="quota-orbit" aria-hidden="true"></div>
        <div class="quota-diagram-hub"><span class="quota-symbol" aria-hidden="true">C</span><strong>{{ c.scope }}</strong></div>
        <div v-for="(category, index) in c.categories" :key="category" class="quota-account"><span class="quota-account-index">0{{ index + 1 }}</span><strong>{{ category }}</strong><span aria-hidden="true">→</span></div>
        <p>SELECT → CONFIGURE → ICS</p>
      </div>
    </div>
    <p class="calendar-notice">{{ c.warning }}</p>
    <div class="quota-features"><article v-for="(feature, index) in c.features" :key="feature[0]"><span>0{{ index + 1 }}</span><h2>{{ feature[0] }}</h2><p>{{ feature[1] }}</p></article></div>
    <div class="calendar-overview">
      <section><h2>{{ c.scope }}</h2><ul><li v-for="item in c.coverage" :key="item">{{ item }}</li></ul></section>
      <section><h2>{{ c.how }}</h2><ol><li v-for="step in c.steps" :key="step">{{ step }}</li></ol></section>
    </div>
  </section>
</template>
