<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteFooter from '../components/SiteFooter.vue'
import SiteNav from '../components/SiteNav.vue'
import { archiveCopy, releases } from '../data/siteRecords'
import { legalCopy, legalDocuments, legalPaths } from '../data/legal'
const { locale } = useI18n()
const lang = computed(() => archiveCopy[locale.value] ? locale.value : 'zh')
const copy = computed(() => archiveCopy[lang.value])
</script>

<template>
  <div class="archive-page"><div class="container"><SiteNav />
    <main class="archive-main" :lang="lang === 'zh' ? 'zh-CN' : lang">
      <header class="archive-heading">
        <p class="eyebrow">// YUASHIE · SITE ARCHIVE</p>
        <div class="archive-title-row"><h1>{{ copy.title }}</h1><span class="archive-version">V0.3.2</span></div>
        <p class="archive-intro">{{ copy.intro }}</p>
      </header>
      <nav class="legal-entry-grid" :aria-label="legalCopy[lang].navigation">
        <RouterLink v-for="(path, key) in legalPaths" :key="key" :to="path" class="legal-entry">
          <span class="legal-entry-code">{{ key.toUpperCase() }} / ↗</span>
          <strong>{{ legalDocuments[lang][key].title }}</strong><span>{{ legalDocuments[lang][key].summary }}</span>
        </RouterLink>
      </nav>
      <section class="release-section" aria-labelledby="release-title">
        <div class="release-section-heading"><h2 id="release-title">{{ copy.log }}</h2><span>{{ copy.order }}</span></div>
        <p class="release-note">{{ copy.note }}</p>
        <ol class="release-list">
          <li v-for="(release, index) in releases" :key="release.version" class="release-item" :class="{ 'release-current': index === 0 }">
            <div class="release-meta"><strong>V{{ release.version }}</strong><time :datetime="release.date">{{ release.date.replaceAll('-', '.') }}</time><span v-if="index === 0" class="release-badge">{{ copy.latest }}</span></div>
            <article class="release-body"><h3>{{ release[lang].title }}</h3><ul><li v-for="item in release[lang].items" :key="item">{{ item }}</li></ul></article>
          </li>
        </ol>
        <aside class="archive-origin"><span>2026.08.24 — 2026.08.28</span><h3>{{ copy.originTitle }}</h3><p>{{ copy.origin }}</p></aside>
      </section>
    </main>
  </div><SiteFooter /></div>
</template>
