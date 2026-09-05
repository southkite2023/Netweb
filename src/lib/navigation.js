import { ref } from 'vue'
export const commandOpen = ref(false)
export const navigationPending = ref(false)
export const navigationError = ref(false)
export const failedPath = ref('')
export function openCommands() { commandOpen.value = true }
