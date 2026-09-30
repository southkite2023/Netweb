<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { detectQuotaPlatform, quotaCopy, quotaDownloadUrl, quotaPlatforms, quotaRelease } from '../data/quotaHub'
import '../quota-hub.css'
const { locale } = useI18n()
const c = computed(() => quotaCopy[locale.value] || quotaCopy.zh)
const detected = ref(null)
const selectedPlatform = ref('Android')
const architecture = ref('universal')
const selectedPackage = computed(() => quotaRelease.packages.find(item => item.id === architecture.value))
const downloadUrl = computed(() => quotaDownloadUrl(selectedPlatform.value, architecture.value))
onMounted(() => {
  detected.value = detectQuotaPlatform(navigator)
  selectedPlatform.value = detected.value || 'Android'
})
</script>

<template>
  <div class="quota-page quota-download">
    <div class="container"><SiteNav /></div>
    <main>
      <div class="quota-subnav"><RouterLink to="/projects/001">← {{ c.back }}</RouterLink><span>QUOTA HUB / {{ quotaRelease.version }}</span></div>
      <section class="quota-hero">
        <div class="quota-hero-orbit" aria-hidden="true"></div>
        <p class="quota-wordmark"><span class="quota-symbol" aria-hidden="true">Q</span> Quota Hub <span class="quota-beta">{{ c.badge }}</span></p>
        <p class="quota-eyebrow">{{ c.eyebrow }}</p>
        <h1>{{ c.headline[0] }}<br><span>{{ c.headline[1] }}</span></h1>
        <p class="quota-intro">{{ c.intro }}</p>
        <div class="quota-download-controls">
          <p class="quota-device" role="status"><span aria-hidden="true" class="quota-status-dot"></span>{{ detected ? `${c.detected} · ${detected}` : c.unknown }}</p>
          <div class="quota-platforms" role="group" :aria-label="c.choose">
            <button v-for="platform in quotaPlatforms" :key="platform" type="button" :aria-pressed="selectedPlatform === platform" @click="selectedPlatform = platform">{{ platform }}</button>
          </div>
          <div v-if="downloadUrl" class="quota-package">
            <label for="quota-architecture">{{ c.architecture }}</label>
            <select id="quota-architecture" v-model="architecture" aria-describedby="quota-architecture-note">
              <option v-for="item in quotaRelease.packages" :key="item.id" :value="item.id">{{ c.packageHints[item.id] }} · {{ item.size }}</option>
            </select>
            <p id="quota-architecture-note" class="quota-fineprint">{{ c.architectureHint }}</p>
            <a class="quota-primary quota-download-button" :href="downloadUrl">{{ c.download }} <span aria-hidden="true">↓</span></a>
            <p class="quota-package-meta">v{{ quotaRelease.version }} · {{ selectedPackage.label }} · {{ selectedPackage.size }}</p>
            <p class="quota-fineprint">{{ c.hosted }}</p>
          </div>
          <div v-else class="quota-unavailable" role="status">
            <p>{{ c.unsupported }}</p>
            <button class="quota-primary" disabled>{{ c.unavailable }}</button>
          </div>
          <RouterLink class="quota-guide-link" to="/projects/001/guide">{{ c.guide }} <span aria-hidden="true">→</span></RouterLink>
        </div>
      </section>
      <section class="quota-benefits">
        <p class="quota-eyebrow">QUOTA HUB / {{ c.name }}</p>
        <h2>{{ c.overview }}</h2>
        <div class="quota-features"><article v-for="(feature, index) in c.features" :key="feature[0]"><span>0{{ index + 1 }}</span><h3>{{ feature[0] }}</h3><p>{{ feature[1] }}</p></article></div>
        <p class="quota-fineprint">{{ c.limits }}</p>
        <div class="quota-resource-links"><a :href="quotaRelease.repository" target="_blank" rel="noopener noreferrer">{{ c.source }} ↗</a><a :href="quotaRelease.url" target="_blank" rel="noopener noreferrer">{{ c.notes }} ↗</a></div>
      </section>
    </main>
    <SiteFooter />
  </div>
</template>
