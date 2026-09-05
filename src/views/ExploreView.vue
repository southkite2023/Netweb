<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { experienceCopy } from '../data/experience'
import { directoryEntries } from '../data/directory'
import { searchEntries } from '../lib/search'
import { readPreference, writePreference } from '../lib/preferences'

const { locale } = useI18n()
const route = useRoute()
const router = useRouter()
const c = computed(() => experienceCopy[locale.value] || experienceCopy.zh)
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const category = ref('all')
let saved = []
try { saved = JSON.parse(readPreference('yuashie-saved-pages', '[]')) } catch { /* Corrupt preferences can be reset. */ }
const favorites = ref(Array.isArray(saved) ? saved.filter(path => typeof path === 'string') : [])
const entries = computed(() => directoryEntries(locale.value))
const results = computed(() => searchEntries(entries.value, query.value, { category: category.value, favorites: favorites.value }))
function toggle(path) {
  favorites.value = favorites.value.includes(path) ? favorites.value.filter(item => item !== path) : [...favorites.value, path]
  writePreference('yuashie-saved-pages', JSON.stringify(favorites.value))
}
function reset() { query.value = ''; category.value = 'all'; router.replace({ path: '/explore' }) }
watch(() => route.query.q, value => { query.value = typeof value === 'string' ? value : '' })
</script>

<template>
  <div class="explore-page"><div class="container"><SiteNav />
    <main class="experience-main">
      <header class="experience-heading"><p class="eyebrow">// FIELD GUIDE</p><h1>{{ c.exploreTitle }}</h1><p>{{ c.exploreIntro }}</p></header>
      <div class="discovery-controls">
        <label class="sr-only" for="explore-search">{{ c.search }}</label>
        <div class="discovery-search"><span aria-hidden="true">⌕</span><input id="explore-search" v-model="query" type="search" :placeholder="c.searchHint" autocomplete="off"></div>
        <div class="discovery-filters" role="group" :aria-label="c.explore"><button v-for="key in ['all', 'projects', 'pages', 'saved']" :key="key" type="button" :aria-pressed="category === key" @click="category = key">{{ c[key] }}</button></div>
      </div>
      <div class="discovery-meta"><span role="status" aria-live="polite">{{ results.length }} {{ c.count }}</span><small>{{ c.localSaved }}</small></div>
      <div v-if="results.length" class="directory-grid">
        <article v-for="item in results" :key="item.path" class="directory-card" :class="{ 'directory-project': item.image }">
          <RouterLink :to="item.path" class="directory-link"><img v-if="item.image" :src="item.image" alt="" width="640" height="400" loading="lazy" decoding="async"><div class="directory-copy"><span class="directory-code">{{ item.category === 'projects' ? 'PROJECT / ' : '' }}{{ item.code }}</span><h2>{{ item.title }}</h2><p>{{ item.description }}</p></div></RouterLink>
          <button class="save-button" type="button" :aria-pressed="favorites.includes(item.path)" :aria-label="`${favorites.includes(item.path) ? c.unsave : c.save} · ${item.title}`" @click="toggle(item.path)">{{ favorites.includes(item.path) ? '★' : '☆' }}</button>
        </article>
      </div>
      <div v-else class="discovery-empty"><span aria-hidden="true">⌕</span><h2>{{ c.empty }}</h2><p>{{ c.emptyHint }}</p><button class="btn btn-secondary" @click="reset">{{ c.reset }}</button></div>
    </main>
  </div><SiteFooter /></div>
</template>
