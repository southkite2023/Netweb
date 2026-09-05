import { computed, ref } from 'vue'
import { readPreference, writePreference } from './preferences'

const theme = ref(readPreference('theme', 'dark') === 'light' ? 'light' : 'dark')
export const isLightMode = computed(() => theme.value === 'light')
export function applyTheme() {
  document.documentElement.dataset.theme = theme.value
}
export function toggleTheme() {
  theme.value = isLightMode.value ? 'dark' : 'light'
  writePreference('theme', theme.value)
  applyTheme()
}
