<script setup>
import { computed, defineAsyncComponent, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { playroomCopy } from '../data/playroom'
import { companionEnabled, companionOpen, setCompanion } from '../lib/companion'
const BongoCat = defineAsyncComponent(() => import('./BongoCat.vue'))
const { locale } = useI18n()
const c = computed(() => playroomCopy[locale.value] || playroomCopy.zh)
const route = useRoute()
const launcher = ref(null)
const panel = ref(null)
async function toggle() {
  companionOpen.value = !companionOpen.value
  await nextTick()
  if (companionOpen.value) panel.value?.focus()
  else launcher.value?.focus()
}
</script>

<template>
  <aside v-if="companionEnabled && route.path !== '/play'" class="companion-dock" :aria-label="c.companion">
    <div v-if="companionOpen" id="companion-panel" ref="panel" class="companion-panel" tabindex="-1" @keydown.esc.stop="toggle">
      <div class="companion-heading"><span>BONGO CAT</span><button type="button" :aria-label="c.close" @click="toggle">×</button></div>
      <BongoCat compact />
      <div class="companion-links"><RouterLink to="/play">{{ c.room }} ↗</RouterLink><button type="button" @click="setCompanion(false)">{{ c.unpin }}</button></div>
    </div>
    <button ref="launcher" type="button" class="companion-launcher" :aria-expanded="companionOpen" aria-controls="companion-panel" @click="toggle"><span aria-hidden="true">🐾</span> {{ companionOpen ? c.close : c.summon }}</button>
  </aside>
</template>

<style scoped>
.companion-dock{position:fixed;left:max(16px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));z-index:35;max-width:calc(100vw - 32px)}.companion-launcher{background:var(--bg-soft);border:1px solid var(--accent);color:var(--text);font:inherit;font-size:.875rem;border-radius:30px;min-height:44px;padding:8px 16px;box-shadow:0 6px 24px #0003;cursor:pointer;display:flex;align-items:center;gap:8px}.companion-panel{width:290px;max-width:calc(100vw - 32px);max-height:calc(100dvh - 100px);overflow-y:auto;padding:16px;background:var(--bg-soft);border:1px solid var(--line);border-radius:18px;box-shadow:0 15px 60px #0005;margin-bottom:10px}.companion-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.75rem;letter-spacing:.12em;color:var(--accent);margin-bottom:10px}.companion-heading button{color:var(--text);background:none;border:0;font-size:1.5rem;min-width:44px;min-height:44px;cursor:pointer}.companion-links{display:flex;align-items:start;flex-direction:column;border-top:1px solid var(--line);margin-top:10px;padding-top:8px;font-size:.875rem}.companion-links a,.companion-links button{padding:10px 0;color:var(--muted);font:inherit;text-decoration:underline;text-underline-offset:4px;background:none;border:0;cursor:pointer}
</style>
