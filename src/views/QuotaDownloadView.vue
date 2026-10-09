<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { detectQuotaPlatform, quotaCopy, quotaDesktopCopy, quotaDownloadUrl, quotaPlatforms, quotaRelease } from '../data/quotaHub'
import '../quota-hub.css'
const { locale } = useI18n()
const c = computed(() => quotaCopy[locale.value] || quotaCopy.zh)
const route = useRoute()
const router = useRouter()
const desktopCopy = computed(() => quotaDesktopCopy[locale.value] || quotaDesktopCopy.zh)
const detected = ref(null)
const selectedPlatform = ref('Android')
const architecture = ref('universal')
const selectedPackage = computed(() => quotaRelease.desktop[selectedPlatform.value] || quotaRelease.packages.find(item => item.id === architecture.value))
const selectedVersion = computed(() => selectedPackage.value?.version || quotaRelease.version)
const selectedReleaseUrl = computed(() => selectedPackage.value?.releaseUrl || quotaRelease.url)
const downloadUrl = computed(() => quotaDownloadUrl(selectedPlatform.value, architecture.value))
onMounted(() => {
  detected.value = detectQuotaPlatform(navigator)
  selectedPlatform.value = quotaPlatforms.includes(route.query.platform) ? route.query.platform : detected.value || 'Android'
})
watch(selectedPlatform, platform => {
  if (platform !== route.query.platform) router.replace({ query: { ...route.query, platform }, hash: route.hash })
})
watch(() => route.query.platform, platform => { if (quotaPlatforms.includes(platform)) selectedPlatform.value = platform })
</script>

<template>
  <div class="quota-page quota-download">
    <div class="container"><SiteNav /></div>
    <main>
      <div class="quota-subnav"><RouterLink to="/projects/001">← {{ c.back }}</RouterLink><span>ASTRACCT / {{ selectedPlatform === 'iOS' ? 'PWA' : selectedVersion }}</span></div>
      <section class="quota-hero">
        <div class="quota-hero-orbit" aria-hidden="true"></div>
        <p class="quota-wordmark"><span class="quota-symbol" aria-hidden="true">Q</span> Astracct <span class="quota-beta">{{ c.badge }}</span></p>
        <p class="quota-eyebrow">{{ c.eyebrow }}</p>
        <h1>{{ c.headline[0] }}<br><span>{{ c.headline[1] }}</span></h1>
        <p class="quota-intro">{{ c.intro }}</p>
        <div class="quota-download-controls">
          <p class="quota-device" role="status"><span aria-hidden="true" class="quota-status-dot"></span>{{ detected ? `${c.detected} · ${detected}` : c.unknown }}</p>
          <div class="quota-platforms" role="group" :aria-label="c.choose">
            <button v-for="platform in quotaPlatforms" :key="platform" type="button" :aria-pressed="selectedPlatform === platform" @click="selectedPlatform = platform">{{ platform }}</button>
          </div>
          <div v-if="selectedPlatform === 'iOS'" class="quota-package">
            <p class="quota-fineprint">{{ c.iosPwaIntro }}</p>
            <a class="quota-primary quota-download-button" href="/assets/astracct/?install=1">{{ c.iosPwaInstall }} <span aria-hidden="true">↗</span></a>
            <p class="quota-package-meta">{{ c.iosPwaMeta }}</p>
            <p class="quota-fineprint">{{ c.iosPwaNote }}</p>
          </div>
          <div v-else-if="downloadUrl" class="quota-package">
            <template v-if="selectedPlatform === 'Android'">
            <label for="quota-architecture">{{ c.architecture }}</label>
            <select id="quota-architecture" v-model="architecture" aria-describedby="quota-architecture-note">
              <option v-for="item in quotaRelease.packages" :key="item.id" :value="item.id">{{ c.packageHints[item.id] }} · {{ item.size }}</option>
            </select>
            <p id="quota-architecture-note" class="quota-fineprint">{{ c.architectureHint }}</p>
            </template>
            <p v-if="selectedPlatform !== 'Android'" class="quota-fineprint">{{ desktopCopy[selectedPlatform] }}</p>
            <a class="quota-primary quota-download-button" :href="downloadUrl">{{ selectedPlatform === 'Android' ? c.download : `${desktopCopy.download} ${selectedPlatform}` }} <span aria-hidden="true">↓</span></a>
            <p class="quota-package-meta">v{{ selectedVersion }} · {{ selectedPackage.label }} · {{ selectedPackage.size }}</p>
            <p class="quota-fineprint">{{ c.hosted }}</p>
            <p v-if="selectedPlatform !== 'Android'" class="quota-fineprint">{{ desktopCopy.usage }}</p>
          </div>
          <div v-else class="quota-unavailable" role="status">
            <p>{{ c.unsupported }}</p>
            <button class="quota-primary" disabled>{{ c.unavailable }}</button>
          </div>
          <RouterLink class="quota-guide-link" to="/projects/001/guide">{{ c.guide }} <span aria-hidden="true">→</span></RouterLink>
        </div>
      </section>
      <section class="quota-benefits">
        <p class="quota-eyebrow">ASTRACCT / {{ c.name }}</p>
        <h2>{{ c.overview }}</h2>
        <div class="quota-features"><article v-for="(feature, index) in c.features" :key="feature[0]"><span>0{{ index + 1 }}</span><h3>{{ feature[0] }}</h3><p>{{ feature[1] }}</p></article></div>
        <p class="quota-fineprint">{{ c.limits }}</p>
        <div class="quota-resource-links"><a :href="quotaRelease.repository" target="_blank" rel="noopener noreferrer">{{ c.source }} ↗</a><a :href="selectedReleaseUrl" target="_blank" rel="noopener noreferrer">{{ c.notes }} ↗</a></div>
      </section>
    </main>
    <SiteFooter />
  </div>
</template>
