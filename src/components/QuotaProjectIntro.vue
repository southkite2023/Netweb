<script setup>
import { computed } from 'vue'
import projectArtwork from '../assets/projects/project-001.svg'
import { useI18n } from 'vue-i18n'
import { quotaCopy, quotaRelease } from '../data/quotaHub'
import '../quota-hub.css'
const { locale } = useI18n()
const c = computed(() => quotaCopy[locale.value] || quotaCopy.zh)
</script>

<template>
  <section class="quota-page quota-project">
    <div class="quota-kicker"><span>PROJECT / 001</span><span>{{ c.badge }} · {{ quotaRelease.latestVersion || quotaRelease.version }}</span></div>
    <div class="quota-project-grid">
      <header>
        <p class="quota-wordmark"><span class="quota-symbol" aria-hidden="true">Q</span> Astracct</p>
        <h1>{{ c.headline[0] }}<br><span>{{ c.headline[1] }}</span></h1>
        <p class="quota-intro">{{ c.intro }}</p>
        <RouterLink class="quota-primary" to="/projects/001/download">{{ c.open }} <span aria-hidden="true">↗</span></RouterLink>
      </header>
      <figure class="project-vector-hero">
        <img :src="projectArtwork" width="1280" height="800" alt="Astracct" decoding="async">
        <figcaption><span v-for="label in c.accounts" :key="label">{{ label }}</span></figcaption>
      </figure>
    </div>
    <div class="quota-features"><article v-for="(feature, index) in c.features" :key="feature[0]"><span>0{{ index + 1 }}</span><h2>{{ feature[0] }}</h2><p>{{ feature[1] }}</p></article></div>
    <p class="quota-fineprint">{{ c.limits }}</p>
  </section>
</template>


<style scoped>
.project-vector-hero { margin:0;min-width:0;align-self:center; }
.project-vector-hero img { display:block;width:100%;height:auto;border:1px solid var(--line);border-radius:18px; }
.project-vector-hero figcaption { display:flex;flex-wrap:wrap;gap:8px;margin-top:14px; }
.project-vector-hero figcaption span { font-size:11px;color:var(--muted);padding:5px 9px;border:1px solid var(--line);border-radius:6px; }
</style>
