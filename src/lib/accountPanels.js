import { ref } from 'vue'
export const devicesOpen = ref(false)
export const openDevices = () => { devicesOpen.value = true }
