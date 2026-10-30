<script setup>
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { calendarCopy, calendarGames, calendarTypes, calendarRepository } from '../data/calendar'
import { CALENDAR_REAL_ANIME_FEEDS, CALENDAR_REAL_ANIME_FEEDS_ZH, CALENDAR_SEASON_CATALOG_URL, CALENDAR_MERGE_HEALTH_URL, animeShowFeedUrl, mergedAnimeFeedUrl, calendarTestUrl, defaultCalendarSelection } from '../lib/calendar'
import { animeSeasonCopy } from '../data/animeSeason'
import '../quota-hub.css'
import '../calendar.css'
const { locale } = useI18n()
const c = computed(() => calendarCopy[locale.value] || calendarCopy.zh)
const selection = reactive(defaultCalendarSelection())
const gamesEnabled = ref(true)
const output = ref('')
const copyState = ref('')
const liveCopyState = ref('')
const realAnimeUrl = computed(() =>
  (seasonLanguage.value === 'zh-CN' ? CALENDAR_REAL_ANIME_FEEDS_ZH : CALENDAR_REAL_ANIME_FEEDS)[seasonMode.value] ||
  (seasonLanguage.value === 'zh-CN' ? CALENDAR_REAL_ANIME_FEEDS_ZH.start : CALENDAR_REAL_ANIME_FEEDS.start)
)
const effective = computed(() => ({ ...selection, games: gamesEnabled.value ? selection.games : {} }))
const candidate = computed(() => calendarTestUrl(effective.value))
const selectedLabels = computed(() => [
  ...(gamesEnabled.value ? calendarGames.flatMap(game => (selection.games[game.id] || []).map(type => `${game[locale.value] || game.en} · ${c.value.types[type]}`)) : []),
  ...(selection.anime ? [c.value.anime] : []), ...(selection.releases ? [c.value.releases] : []),
])
function toggleGame(id, enabled) {
  selection.games[id] = enabled ? [...calendarTypes] : []
}
watch(candidate, () => { output.value = ''; copyState.value = '' })
// Computed watchers that access seasonal refs are registered after the refs exist.
async function copyUrl() {
  const value = output.value
  try {
    await navigator.clipboard.writeText(value)
    if (output.value === value) copyState.value = 'copied'
  } catch {
    if (output.value === value) copyState.value = 'copyFailed'
  }
}
async function copyRealAnimeUrl() {
  try {
    await navigator.clipboard.writeText(realAnimeUrl.value)
    liveCopyState.value = 'copied'
  } catch {
    liveCopyState.value = 'copyFailed'
  }
}

const picker = computed(() => animeSeasonCopy[locale.value] || animeSeasonCopy.zh)
const seasonCatalog = ref(null)
const seasonStatus = ref('loading')
const seasonSearch = ref('')
const selectedShowIds = ref([])
const seasonCopyState = ref('')
const mergeApiStatus = ref('checking')
const mergeApiVersion = ref(0)
const seasonLanguage = ref(locale.value === 'zh' ? 'zh-CN' : 'ja')
const supportsSelectedLanguage = computed(() =>
  mergeApiStatus.value === 'ready' && (seasonLanguage.value === 'ja' || mergeApiVersion.value >= 2)
)
const mergedCopyState = ref('')
const mergedUrl = computed(() => mergedAnimeFeedUrl(selectedShowIds.value, seasonMode.value, seasonLanguage.value))
const seasonMode = ref('duration')
const seasonShows = computed(() => seasonCatalog.value?.shows || [])
const visibleSeasonShows = computed(() => seasonShows.value.filter(show =>
  [show.title, show.title_zh, ...show.aliases].filter(Boolean).some(name =>
    name.toLocaleLowerCase().includes(seasonSearch.value.trim().toLocaleLowerCase()))
))
const selectedSeasonShows = computed(() => seasonShows.value.filter(show => selectedShowIds.value.includes(show.id)))
const seasonTitle = computed(() => seasonCatalog.value
  ? `${seasonCatalog.value.year} ${picker.value.season[seasonCatalog.value.season] || seasonCatalog.value.season}`
  : '')
function showFeedUrl(id) {
  return animeShowFeedUrl(id, seasonMode.value, seasonLanguage.value)
}
function showDisplayName(show) {
  return seasonLanguage.value === 'zh-CN' && show.title_zh ? show.title_zh : show.title
}
function showTranslationSource(show) {
  if (seasonLanguage.value !== 'zh-CN') return ''
  if (show.title_zh_source === 'official') return picker.value.sourceOfficial
  if (show.title_zh_source === 'bangumi') return picker.value.sourceCommunity
  return picker.value.sourceOriginal
}
function nextAiringLabel(show) {
  if (!Number.isSafeInteger(show.next_airing_at)) return picker.value.unscheduled
  const language = locale.value === 'ja' ? 'ja-JP' : locale.value === 'zh' ? 'zh-CN' : 'en-US'
  return `${picker.value.next} · ${new Date(show.next_airing_at * 1000).toLocaleString(language, {
    timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })} JST`
}
async function loadSeasonCatalog() {
  seasonStatus.value = 'loading'
  try {
    const response = await fetch(CALENDAR_SEASON_CATALOG_URL, { cache: 'no-store' })
    if (!response.ok) throw new Error('Catalog HTTP error')
    const data = await response.json()
    if (data.schema_version !== 1 || !['WINTER', 'SPRING', 'SUMMER', 'FALL'].includes(data.season) ||
        !Number.isInteger(data.year) || !Array.isArray(data.shows)) throw new Error('Invalid catalog')
    const known = new Set()
    const shows = data.shows.map(s => {
      if (!Number.isSafeInteger(s.id) || s.id <= 0 || known.has(s.id) ||
          typeof s.title !== 'string' || !s.title.trim()) throw new Error('Invalid show')
      known.add(s.id)
      return {
        id: s.id, title: s.title,
        title_zh: typeof s.title_zh === 'string' && s.title_zh.trim() ? s.title_zh.trim() : null,
        title_zh_source: ['official', 'bangumi'].includes(s.title_zh_source) ? s.title_zh_source : 'none',
        title_zh_source_url: typeof s.title_zh_source_url === 'string' &&
          /^https:\/\/(bgm\.tv\/subject\/\d+|[^/]+\/)/.test(s.title_zh_source_url)
          ? s.title_zh_source_url : null,
        aliases: Array.isArray(s.aliases) ? s.aliases.filter(v => typeof v === 'string') : [],
        next_airing_at: s.next_airing_at, next_episode: s.next_episode,
      }
    })
    seasonCatalog.value = { season: data.season, year: data.year, shows }
    selectedShowIds.value = selectedShowIds.value.filter(id => known.has(id))
    seasonStatus.value = 'ready'
  } catch {
    seasonStatus.value = 'error'
  }
}
onMounted(loadSeasonCatalog)
onMounted(async () => {
  try {
    const response = await fetch(CALENDAR_MERGE_HEALTH_URL, { cache: 'no-store' })
    const data = response.ok ? await response.json() : null
    mergeApiVersion.value = Number.isInteger(data?.version) ? data.version : 0
    mergeApiStatus.value = data?.ok === true && data.service === 'anime-ics-selection' && mergeApiVersion.value >= 1 ? 'ready' : 'unavailable'
  } catch {
    mergeApiStatus.value = 'unavailable'
  }
})
async function copyMergedUrl() {
  if (!supportsSelectedLanguage.value || !mergedUrl.value) return
  try {
    await navigator.clipboard.writeText(mergedUrl.value)
    mergedCopyState.value = picker.value.mergedCopied
  } catch {
    mergedCopyState.value = picker.value.copyFailed
  }
}
async function copySingleShow(id) {
  const url = showFeedUrl(id)
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    seasonCopyState.value = picker.value.copied
  } catch {
    seasonCopyState.value = picker.value.copyFailed
  }
}
async function copySelectedShows() {
  if (!selectedSeasonShows.value.length) return
  try {
    await navigator.clipboard.writeText(selectedSeasonShows.value.map(show => showFeedUrl(show.id)).join('\n'))
    seasonCopyState.value = picker.value.copied
  } catch {
    seasonCopyState.value = picker.value.copyFailed
  }
}
watch([selectedShowIds, seasonMode, seasonLanguage], () => { seasonCopyState.value = ''; mergedCopyState.value = '' }, { deep: true })
watch(realAnimeUrl, () => { liveCopyState.value = '' })
</script>

<template>
  <div class="quota-page calendar-page">
    <div class="container"><SiteNav />
      <main class="calendar-main">
        <nav class="quota-kicker" :aria-label="c.back"><RouterLink class="quota-back" to="/projects/004">← {{ c.back }}</RouterLink><span>CALENDAR / CONFIGURATOR</span></nav>
        <header class="calendar-heading"><p class="quota-eyebrow">{{ c.badge }}</p><h1>{{ c.generator }}</h1><p class="quota-intro">{{ c.intro }}</p></header>
        <p id="calendar-test-note" class="calendar-notice">{{ c.warning }}</p>
        <section id="anime-season-picker" class="calendar-season-picker" :aria-label="picker.title">
          <p class="quota-eyebrow">ANIME / SEASON PICKER</p>
          <h2>{{ picker.title }} <span v-if="seasonCatalog">· {{ seasonTitle }}</span></h2>
          <p class="quota-fineprint">{{ picker.intro }}</p>
          <template v-if="seasonStatus === 'loading'">
            <p role="status">{{ picker.loading }}</p>
          </template>
          <template v-else-if="seasonStatus === 'error'">
            <p role="alert">{{ picker.error }}</p>
            <button class="btn btn-secondary" type="button" @click="loadSeasonCatalog">{{ picker.retry }}</button>
          </template>
          <template v-else>
            <fieldset class="calendar-season-mode">
              <legend>{{ c.mode }}</legend>
              <label><input v-model="seasonMode" type="radio" name="anime-season-mode" value="duration"> {{ c.duration }}</label>
              <label><input v-model="seasonMode" type="radio" name="anime-season-mode" value="start"> {{ c.start }}</label>
            </fieldset>
            <fieldset class="calendar-season-mode">
              <legend>{{ picker.languageTitle }}</legend>
              <label><input v-model="seasonLanguage" type="radio" name="anime-season-language" value="zh-CN"> {{ picker.languageChinese }}</label>
              <label><input v-model="seasonLanguage" type="radio" name="anime-season-language" value="ja"> {{ picker.languageJapanese }}</label>
            </fieldset>
            <p class="quota-fineprint">{{ picker.chineseNote }}</p>
            <label class="calendar-season-search">
              <span>{{ picker.search }}</span>
              <input v-model="seasonSearch" type="search" :placeholder="picker.searchPlaceholder">
            </label>
            <p v-if="!visibleSeasonShows.length" class="quota-fineprint">{{ picker.empty }}</p>
            <div v-else class="calendar-season-list">
              <label v-for="show in visibleSeasonShows" :key="show.id" class="calendar-season-item">
                <input v-model="selectedShowIds" type="checkbox" :value="show.id">
                <span class="calendar-season-info">
                  <strong>{{ showDisplayName(show) }}</strong>
                  <small v-if="seasonLanguage === 'zh-CN' && show.title_zh && show.title_zh !== show.title">{{ show.title }}</small>
                  <small v-if="seasonLanguage === 'zh-CN'">{{ showTranslationSource(show) }}</small>
                  <small>{{ nextAiringLabel(show) }}</small>
                </span>
              </label>
            </div>
            <div class="calendar-selected-shows">
              <h3>{{ picker.selected }} {{ selectedSeasonShows.length }} {{ picker.shows }}</h3>
              <section class="calendar-merged-box" :aria-label="picker.mergedTitle">
                <h4>{{ picker.mergedTitle }}</h4>
                <p class="quota-fineprint">{{ picker.mergedHint }}</p>
                <template v-if="supportsSelectedLanguage">
                  <p role="status" class="quota-fineprint">{{ picker.mergedReady }}</p>
                  <template v-if="mergedUrl">
                    <code class="calendar-live-url">{{ mergedUrl }}</code>
                    <button class="btn btn-secondary" type="button" @click="copyMergedUrl">{{ picker.mergedCopy }}</button>
                    <a :href="mergedUrl" target="_blank" rel="noopener noreferrer">{{ picker.mergedOpen }} ↗</a>
                  </template>
                  <p v-else class="quota-fineprint">{{ picker.mergedSelected }}</p>
                </template>
                <p v-else class="quota-fineprint">{{ seasonLanguage === 'zh-CN' && mergeApiStatus === 'ready' ? picker.chineseMergeUnavailable : picker.mergedUnavailable }}</p>
                <p role="status" aria-live="polite" class="quota-fineprint">{{ mergedCopyState }}</p>
              </section>
              <p class="quota-fineprint">{{ picker.selectHint }}</p>
              <button class="btn btn-secondary" type="button" :disabled="!selectedSeasonShows.length" @click="copySelectedShows">{{ picker.copyAll }}</button>
              <p role="status" aria-live="polite" class="quota-fineprint">{{ seasonCopyState }}</p>
              <ul v-if="selectedSeasonShows.length">
                <li v-for="show in selectedSeasonShows" :key="show.id">
                  <strong>{{ showDisplayName(show) }}</strong>
                  <a v-if="seasonLanguage === 'zh-CN' && show.title_zh_source_url"
                     :href="show.title_zh_source_url" target="_blank" rel="noopener noreferrer">{{ picker.sourceLink }}</a>
                  <button class="btn btn-secondary" type="button" @click="copySingleShow(show.id)">{{ picker.subscribe }}</button>
                  <code>{{ showFeedUrl(show.id) }}</code>
                </li>
              </ul>
            </div>
          </template>
        </section>
        <details class="calendar-live-panel">
          <summary>{{ picker.allFeed }}</summary>
          <h2>{{ c.liveAnimeTitle }}</h2>
          <p>{{ c.liveAnimeDescription }}</p>
          <div class="calendar-live-actions">
            <a :href="realAnimeUrl" target="_blank" rel="noopener noreferrer">{{ c.liveAnimeOpen }} ↗</a>
            <button class="btn btn-secondary" type="button" @click="copyRealAnimeUrl">{{ c.liveAnimeCopy }}</button>
          </div>
          <code class="calendar-live-url">{{ realAnimeUrl }}</code>
          <p class="quota-fineprint">{{ c.liveAnimeHint }}</p>
          <p role="status" aria-live="polite" class="quota-fineprint">{{ liveCopyState ? c[liveCopyState] : '' }}</p>
        </details>
        <div class="calendar-builder">
          <form class="calendar-options" aria-describedby="calendar-test-note" @submit.prevent="output = candidate || ''; copyState = ''">
            <fieldset><legend>01 / {{ c.select }}</legend>
              <label class="calendar-choice"><input v-model="gamesEnabled" type="checkbox">{{ c.categories[0] }}</label>
              <fieldset v-if="gamesEnabled" class="calendar-games"><legend class="sr-only">{{ c.games }}</legend>
                <div v-for="game in calendarGames" :key="game.id" class="calendar-game">
                  <label class="calendar-choice"><input type="checkbox" :checked="!!selection.games[game.id]?.length" @change="toggleGame(game.id, $event.target.checked)">{{ game[locale] || game.en }}</label>
                  <div class="calendar-types"><label v-for="type in calendarTypes" :key="type" class="calendar-choice"><input v-model="selection.games[game.id]" type="checkbox" :value="type">{{ c.types[type] }}</label></div>
                </div>
              </fieldset>
              <label class="calendar-choice"><input v-model="selection.anime" type="checkbox" aria-describedby="calendar-anime-note">{{ c.anime }}</label><p id="calendar-anime-note" class="quota-fineprint">{{ c.animeHint }}</p>
              <label class="calendar-choice"><input v-model="selection.releases" type="checkbox" aria-describedby="calendar-release-note">{{ c.releases }}</label><p id="calendar-release-note" class="quota-fineprint">{{ c.releaseHint }}</p>
            </fieldset>
            <fieldset><legend>02 / {{ c.mode }}</legend>
              <label class="calendar-choice"><input v-model="selection.mode" type="radio" name="display-mode" value="start" aria-describedby="calendar-start-note">{{ c.start }}</label><p id="calendar-start-note" class="quota-fineprint">{{ c.startHint }}</p>
              <label class="calendar-choice"><input v-model="selection.mode" type="radio" name="display-mode" value="duration" aria-describedby="calendar-duration-note">{{ c.duration }}</label><p id="calendar-duration-note" class="quota-fineprint">{{ c.durationHint }}</p>
              <div class="calendar-preview"><p>{{ c.diagram }}</p><div class="calendar-days"><div v-for="day in 7" :key="day"><small>{{ c.day }} {{ day }}</small><span v-if="day === 1 || (selection.mode === 'duration' && day <= 5)">{{ c.sample }}</span></div></div></div>
              <p class="quota-fineprint">{{ c.timezone }}</p>
            </fieldset>
            <button class="quota-primary" type="submit" :disabled="!candidate">{{ c.generate }} →</button>
            <p v-if="!candidate" role="status" class="quota-fineprint">{{ c.empty }}</p>
          </form>
          <aside class="calendar-result">
            <p class="quota-eyebrow">03 / ICS</p><h2>{{ c.output }}</h2><p class="calendar-status">{{ c.unavailable }}</p>
            <h3>{{ c.summary }}</h3><ul><li v-for="label in selectedLabels" :key="label">{{ label }}</li></ul>
            <template v-if="output"><label class="sr-only" for="calendar-url">{{ c.output }}</label><textarea id="calendar-url" :value="output" readonly rows="7" spellcheck="false" aria-describedby="calendar-test-note" @focus="$event.target.select()"></textarea><button class="btn btn-secondary" type="button" @click="copyUrl">{{ c.copy }}</button></template>
            <p v-else class="quota-fineprint">{{ c.pending }}</p>
            <p role="status" aria-live="polite" class="quota-fineprint">{{ copyState ? c[copyState] : '' }}</p>
            <div class="calendar-source"><p class="quota-fineprint">{{ c.sourceHint }}</p><a :href="calendarRepository" target="_blank" rel="noopener noreferrer">{{ c.source }} ↗</a></div>
          </aside>
        </div>
      </main>
    </div><SiteFooter />
  </div>
</template>
