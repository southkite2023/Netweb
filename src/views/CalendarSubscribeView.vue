<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { calendarCopy, calendarGames, calendarTypes, calendarRepository } from '../data/calendar'
import { calendarTestUrl, defaultCalendarSelection } from '../lib/calendar'
import '../quota-hub.css'
import '../calendar.css'
const { locale } = useI18n()
const c = computed(() => calendarCopy[locale.value] || calendarCopy.zh)
const selection = reactive(defaultCalendarSelection())
const gamesEnabled = ref(true)
const output = ref('')
const copyState = ref('')
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
async function copyUrl() {
  const value = output.value
  try {
    await navigator.clipboard.writeText(value)
    if (output.value === value) copyState.value = 'copied'
  } catch {
    if (output.value === value) copyState.value = 'copyFailed'
  }
}
</script>

<template>
  <div class="quota-page calendar-page">
    <div class="container"><SiteNav />
      <main class="calendar-main">
        <nav class="quota-kicker" :aria-label="c.back"><RouterLink class="quota-back" to="/projects/004">← {{ c.back }}</RouterLink><span>CALENDAR / CONFIGURATOR</span></nav>
        <header class="calendar-heading"><p class="quota-eyebrow">{{ c.badge }}</p><h1>{{ c.generator }}</h1><p class="quota-intro">{{ c.intro }}</p></header>
        <p id="calendar-test-note" class="calendar-notice">{{ c.warning }}</p>
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
