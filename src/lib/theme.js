import { rollWeather, stopWeather } from './weather'
import { computed, ref } from 'vue'
import { readPreference, writePreference } from './preferences'

const theme = ref(readPreference('theme', 'dark') === 'light' ? 'light' : 'dark')
export const isLightMode = computed(() => theme.value === 'light')
export function applyTheme() {
  document.documentElement.dataset.theme = theme.value
}
export function setTheme(value, persist = true) {
  stopWeather()
  theme.value = value === 'light' ? 'light' : 'dark'
  if (persist) writePreference('theme', theme.value)
  applyTheme()
}
export function toggleTheme() { setTheme(isLightMode.value ? 'dark' : 'light'); rollWeather(isLightMode.value) }
