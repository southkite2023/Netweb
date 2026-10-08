import { ref } from 'vue'
import { readPreference, writePreference } from './preferences'
// No optional tracking is installed. All choices enable only necessary storage.
export const privacyOpen = ref(!readPreference('yuashie-privacy-v1'))
export const openPrivacy = () => { privacyOpen.value = true }
export function savePrivacy(choice) {
  writePreference('yuashie-privacy-v1', JSON.stringify({ version: 1, choice, optional: false, at: new Date().toISOString() }))
  privacyOpen.value = false
}
export const optionalTrackingAllowed = () => false
