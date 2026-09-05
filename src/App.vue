<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import BackToTop from './components/BackToTop.vue'
import { experienceCopy } from './data/experience'
import { directoryEntries } from './data/directory'
import { commandOpen, openCommands, navigationPending, navigationError, failedPath } from './lib/navigation'

const CommandPalette = defineAsyncComponent(() => import('./components/CommandPalette.vue'))
const { locale } = useI18n()
const route = useRoute()
const router = useRouter()
const c = computed(() => experienceCopy[locale.value] || experienceCopy.zh)
const offline = ref(false)
function updateConnection() { offline.value = !navigator.onLine }
function onKey(event) {
  if (event.isComposing || event.repeat || event.altKey) return
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    if (document.querySelector('dialog[open], [aria-modal="true"]') && !commandOpen.value) return
    event.preventDefault()
    commandOpen.value ? commandOpen.value = false : openCommands()
  }
}
function retry() { window.location.assign(router.resolve(failedPath.value || route.fullPath).href) }
function skip() { document.querySelector('main')?.focus() }
watchEffect(() => {
  const entry = directoryEntries(locale.value).find(item => item.path === route.path)
  const title = entry?.title || ({ home: c.value.home, explore: c.value.explore, projects: c.value.projects, 'not-found': '404', register: c.value.login }[route.name]) || 'Yuashie'
  document.title = title === 'Yuashie' ? title : `${title} · Yuashie`
})
onMounted(() => {
  updateConnection()
  window.addEventListener('keydown', onKey)
  window.addEventListener('online', updateConnection)
  window.addEventListener('offline', updateConnection)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('online', updateConnection)
  window.removeEventListener('offline', updateConnection)
})
</script>

<template>
  <a class="skip-link" href="#main-content" @click="skip">{{ c.skip }}</a>
  <div v-if="navigationPending" class="route-progress" role="status" :aria-label="c.loading"></div>
  <div v-if="offline" class="connection-banner" role="status">{{ c.offline }}</div>
  <RouterView />
  <div v-if="navigationError" class="route-error" role="alert"><p>{{ c.routeError }}</p><button class="btn btn-primary" @click="retry">{{ c.retry }}</button></div>
  <CommandPalette v-if="commandOpen" />
  <BackToTop />
</template>
