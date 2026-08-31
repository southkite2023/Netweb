<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const visible = ref(false)
const label = computed(() => ({ zh: '返回顶部', en: 'Back to top', ja: 'ページの先頭へ' }[locale.value] || '返回顶部'))

function updateVisibility() {
  visible.value = window.scrollY > 0
}

function backToTop() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, left: 0, behavior: reducedMotion ? 'instant' : 'smooth' })
}

onMounted(() => {
  updateVisibility()
  window.addEventListener('scroll', updateVisibility, { passive: true })
  window.addEventListener('resize', updateVisibility)
  window.addEventListener('pageshow', updateVisibility)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateVisibility)
  window.removeEventListener('resize', updateVisibility)
  window.removeEventListener('pageshow', updateVisibility)
})
</script>

<template>
  <button v-if="visible" class="back-to-top" type="button" :aria-label="label" :title="label" @click="backToTop">
    <span class="back-to-top-arrow" aria-hidden="true">↑</span>
    <span aria-hidden="true">TOP</span>
  </button>
</template>

<style scoped>
.back-to-top {
  position: fixed;
  right: max(20px, env(safe-area-inset-right));
  bottom: calc(20px + env(safe-area-inset-bottom));
  z-index: 50;
  display: grid;
  place-content: center;
  gap: 2px;
  width: 56px;
  height: 56px;
  border: 1px solid var(--accent);
  border-radius: 14px;
  background: var(--bg-soft);
  color: var(--accent);
  box-shadow: 0 6px 24px rgba(0, 0, 0, .2);
  font: 700 10px/1 monospace;
  letter-spacing: .08em;
  cursor: pointer;
}
.back-to-top-arrow { font-size: 22px; }
.back-to-top:hover { background: var(--accent); color: var(--accent-ink); }
.back-to-top:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
</style>
