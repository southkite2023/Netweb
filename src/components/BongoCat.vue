<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { playroomCopy } from '../data/playroom'

defineProps({ compact: Boolean })
const { locale } = useI18n()
const c = computed(() => playroomCopy[locale.value] || playroomCopy.zh)
const paws = ref({ left: false, right: false })
const taps = ref(0)
const sound = ref(false)
const audioError = ref(false)
const timers = {}
let context
let disposed = false
async function beat(side) {
  if (!sound.value || document.hidden || disposed) return
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    context ||= new AudioContext()
    await context.resume()
    if (disposed || !sound.value || document.hidden) return
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime
    oscillator.frequency.setValueAtTime(side === 'left' ? 190 : 280, now)
    oscillator.frequency.exponentialRampToValueAtTime(65, now + .13)
    gain.gain.setValueAtTime(.22, now)
    gain.gain.exponentialRampToValueAtTime(.001, now + .15)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + .16)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
  } catch { sound.value = false; audioError.value = true }
}
function hit(side) {
  if (paws.value[side]) return
  paws.value[side] = true
  taps.value++
  clearTimeout(timers[side])
  timers[side] = setTimeout(() => { paws.value[side] = false }, 140)
  void beat(side)
}
function onKey(event) {
  if (event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
  const side = { a: 'left', d: 'right' }[event.key.toLowerCase()]
  if (side) { event.preventDefault(); hit(side) }
}
function toggleSound() {
  sound.value = !sound.value
  audioError.value = false
  if (sound.value) void beat('left')
  else context?.suspend().catch(() => {})
}
function pause() { if (document.hidden) context?.suspend().catch(() => {}) }
onMounted(() => document.addEventListener('visibilitychange', pause))
onBeforeUnmount(() => {
  disposed = true
  Object.values(timers).forEach(clearTimeout)
  context?.close().catch(() => {})
  document.removeEventListener('visibilitychange', pause)
})
</script>

<template>
  <div class="bongo-cat" :class="{ 'bongo-compact': compact }" tabindex="0" role="group" :aria-label="c.catTitle" @keydown="onKey">
    <div class="bongo-stage" role="img" :aria-label="c.catTitle">
      <span class="bongo-layer bongo-head"></span><span class="bongo-layer bongo-mouth"></span>
      <span class="bongo-layer bongo-drums"></span>
      <span class="bongo-layer bongo-paw bongo-left" :class="{ hit: paws.left }"></span>
      <span class="bongo-layer bongo-paw bongo-right" :class="{ hit: paws.right }"></span>
    </div>
    <p v-if="!compact" class="bongo-message">{{ taps === 0 ? c.catHello : taps % 12 < 6 ? c.catCheers : c.catRest }}</p>
    <div class="bongo-pads">
      <button type="button" :class="{ active: paws.left }" @click="hit('left')"><kbd>A</kbd> {{ c.left }}</button>
      <button type="button" :class="{ active: paws.right }" @click="hit('right')"><kbd>D</kbd> {{ c.right }}</button>
    </div>
    <div class="bongo-controls"><span>{{ taps }} {{ c.taps }}</span><button type="button" :aria-pressed="sound" @click="toggleSound">{{ sound ? c.soundOff : c.soundOn }}</button></div>
    <p v-if="audioError" class="play-note" role="status">{{ c.audioError }}</p>
    <p v-if="!compact" class="play-note">{{ c.catHint }}</p>
  </div>
</template>

<style scoped>
.bongo-cat{outline-offset:5px;border-radius:16px}.bongo-stage{position:relative;aspect-ratio:16/9;background:#fff;border-radius:16px;overflow:hidden;isolation:isolate}.bongo-layer{position:absolute;inset:0;background-repeat:no-repeat;pointer-events:none}.bongo-head{background-image:url('/assets/companions/bongo/cat.png');background-size:100% 200%;z-index:1}.bongo-mouth{background-image:url('/assets/companions/bongo/mouth.png');background-size:200% 200%;z-index:2}.bongo-drums{background-image:url('/assets/companions/bongo/bongo.png');background-size:100% 100%;z-index:3}.bongo-paw{background-size:200% 200%;z-index:4}.bongo-left{background-image:url('/assets/companions/bongo/paw-left.png')}.bongo-right{background-image:url('/assets/companions/bongo/paw-right.png')}.bongo-paw.hit{background-position-x:100%}.bongo-message{font-size:1rem;text-align:center;min-height:1.6em;margin:18px 0}.bongo-pads{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.bongo-pads button{border:1px solid var(--line);border-bottom:3px solid var(--accent);background:var(--card);color:var(--text);padding:14px 10px;border-radius:10px;font:inherit;cursor:pointer;touch-action:manipulation}.bongo-pads button.active{background:var(--soft-hover);border-color:var(--accent)}.bongo-pads kbd{font-size:.85rem;color:var(--accent);margin-right:6px}.bongo-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:.875rem;color:var(--muted);padding-top:12px}.bongo-controls button{font:inherit;color:var(--text);background:none;border:0;min-height:44px;cursor:pointer;text-decoration:underline;text-underline-offset:4px}.play-note{font-size:.875rem;color:var(--muted);line-height:1.6;margin:8px 0}.bongo-compact .bongo-pads{margin-top:10px}.bongo-compact .bongo-pads button{font-size:.875rem;padding:10px 5px}.bongo-compact .bongo-controls{padding-top:4px}
</style>
