import { ref } from 'vue'
import { readPreference, writePreference } from './preferences'

export const companionEnabled = ref(readPreference('yuashie-companion', 'off') === 'on')
export const companionOpen = ref(false)
export function setCompanion(value) {
  companionEnabled.value = value
  companionOpen.value = value
  writePreference('yuashie-companion', value ? 'on' : 'off')
}
