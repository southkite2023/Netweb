<script setup>
import { computed } from 'vue'
import projectArtwork from '../assets/projects/project-004.svg'
import { useI18n } from 'vue-i18n'
import { calendarCopy } from '../data/calendar'
import { CALENDAR_REAL_ANIME_FEEDS } from '../lib/calendar'
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
      <figure class="project-vector-hero">
        <img :src="projectArtwork" width="1280" height="800" alt="Yuashie Calendar" decoding="async">
        <figcaption><span v-for="label in c.categories" :key="label">{{ label }}</span></figcaption>
      </figure>
    </div>
    <p class="calendar-notice">{{ c.warning }}</p>
    <section class="calendar-live-panel" :aria-label="c.liveAnimeTitle">
      <p class="quota-eyebrow">LIVE / ANILIST</p>
      <h2>{{ c.liveAnimeTitle }}</h2>
      <p>{{ c.liveAnimeDescription }}</p>
      <div class="calendar-live-actions">
        <a :href="CALENDAR_REAL_ANIME_FEEDS.duration" target="_blank" rel="noopener noreferrer">{{ c.liveAnimeOpen }} ↗</a>
      </div>
      <p class="quota-fineprint">{{ c.liveAnimeHint }}</p>
    </section>
    <div class="quota-features"><article v-for="(feature, index) in c.features" :key="feature[0]"><span>0{{ index + 1 }}</span><h2>{{ feature[0] }}</h2><p>{{ feature[1] }}</p></article></div>
    <div class="calendar-overview">
      <section><h2>{{ c.scope }}</h2><ul><li v-for="item in c.coverage" :key="item">{{ item }}</li></ul></section>
      <section><h2>{{ c.how }}</h2><ol><li v-for="step in c.steps" :key="step">{{ step }}</li></ol></section>
    </div>
  </section>
</template>

<style scoped>
.project-vector-hero { margin:0;min-width:0;align-self:center; }
.project-vector-hero img { display:block;width:100%;height:auto;border:1px solid var(--line);border-radius:18px; }
.project-vector-hero figcaption { display:flex;flex-wrap:wrap;gap:8px;margin-top:14px; }
.project-vector-hero figcaption span { font-size:11px;color:var(--muted);padding:5px 9px;border:1px solid var(--line);border-radius:6px; }
</style>
