import { ref } from 'vue'
export const weather = ref(null)
export function stopWeather() { weather.value = null }
export function rollWeather(light, random = Math.random) {
  weather.value = random() < 0.25 ? (light ? 'rain' : 'meteors') : null
}
