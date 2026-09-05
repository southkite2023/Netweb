<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { experienceCopy } from '../data/experience'
import { directoryEntries } from '../data/directory'
import { searchEntries } from '../lib/search'
import { commandOpen } from '../lib/navigation'

const { locale } = useI18n()
const router = useRouter()
const c = computed(() => experienceCopy[locale.value] || experienceCopy.zh)
const query = ref('')
const active = ref(0)
const dialog = ref(null)
const input = ref(null)
const results = computed(() => searchEntries(directoryEntries(locale.value), query.value).slice(0, 9))
let previousFocus
function close() { commandOpen.value = false }
async function choose(item) { if (item) { close(); await router.push(item.path) } }
function keyboard(event) {
  if (event.isComposing) return
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = (active.value + (event.key === 'ArrowDown' ? 1 : -1) + results.value.length) % (results.value.length || 1)
    nextTick(() => document.getElementById(`command-result-${active.value}`)?.scrollIntoView({ block: 'nearest' }))
  }
  if (event.key === 'Enter') { event.preventDefault(); choose(results.value[active.value]) }
}
watch(query, () => { active.value = 0 })
watch(locale, () => { active.value = 0 })
onMounted(async () => {
  previousFocus = document.activeElement
  dialog.value.showModal()
  await nextTick()
  input.value?.focus()
})
onBeforeUnmount(() => { dialog.value?.close(); previousFocus?.focus?.() })
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="command-dialog" aria-labelledby="command-title" @cancel.prevent="close" @click="event => { if (event.target === dialog) close() }">
      <div class="command-inner">
        <div class="command-heading"><h2 id="command-title">{{ c.shortcut }}</h2><button class="icon-button" :aria-label="c.close" @click="close">×</button></div>
        <label class="sr-only" for="command-search">{{ c.search }}</label>
        <input id="command-search" ref="input" v-model="query" class="command-input" :placeholder="c.searchHint" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="command-results" :aria-activedescendant="results.length ? `command-result-${active}` : undefined" @keydown="keyboard">
        <ul id="command-results" class="command-results" role="listbox" :aria-label="c.search">
          <li v-for="(item, index) in results" :id="`command-result-${index}`" :key="item.path" role="option" :aria-selected="index === active" @click="choose(item)" @pointermove="active = index"><span class="command-code">{{ item.code }}</span><span><strong>{{ item.title }}</strong><small>{{ item.path }}</small></span><span aria-hidden="true">↵</span></li>
        </ul>
        <p v-if="!results.length" class="command-empty" role="status">{{ c.empty }}</p>
        <div class="command-help"><span>↑ ↓ {{ c.move }}</span><span>↵ {{ c.open }}</span><span>Esc {{ c.close }}</span></div>
      </div>
    </dialog>
  </Teleport>
</template>
