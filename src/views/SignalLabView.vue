<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { experienceCopy } from '../data/experience'
import { encodeMorse, morseTimeline } from '../lib/morse'

const { locale } = useI18n()
const c = computed(() => experienceCopy[locale.value] || experienceCopy.zh)
const message = ref('CQ CQ DE YUASHIE')
const speed = ref(18)
const frequency = ref(600)
const playing = ref(false)
const notice = ref('')
const now = ref(new Date())
const encoded = computed(() => encodeMorse(message.value))
const playable = computed(() => Boolean(encoded.value.code) && !encoded.value.unsupported.length)
const clockZones = ['UTC', 'Asia/Shanghai', 'Asia/Tokyo']
const clocks = computed(() => clockZones.map(zone => ({ zone, time: new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(now.value) })))
let audioContext, oscillator, timer, clockTimer
let playbackGeneration = 0
function stop() {
  playbackGeneration += 1
  clearTimeout(timer)
  try { oscillator?.stop() } catch { /* Already stopped. */ }
  oscillator = null
  if (audioContext) { audioContext.close().catch(() => {}); audioContext = null }
  playing.value = false
}
async function play() {
  stop()
  notice.value = ''
  if (!playable.value) return
  const generation = playbackGeneration
  playing.value = true
  try {
    const Audio = window.AudioContext || window.webkitAudioContext
    if (!Audio) throw new Error('Audio unavailable')
    const context = new Audio()
    audioContext = context
    await context.resume()
    if (generation !== playbackGeneration) return
    const { tones, duration } = morseTimeline(encoded.value.code, speed.value)
    oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = Number(frequency.value)
    gain.gain.value = 0
    oscillator.connect(gain).connect(context.destination)
    const start = context.currentTime + 0.06
    for (const tone of tones) {
      const at = start + tone.start
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(0.12, at + 0.004)
      gain.gain.setValueAtTime(0.12, at + tone.duration - 0.004)
      gain.gain.linearRampToValueAtTime(0, at + tone.duration)
    }
    oscillator.start(start)
    oscillator.stop(start + duration + 0.01)
    timer = setTimeout(stop, (duration + 0.1) * 1000)
  } catch {
    if (generation === playbackGeneration) { stop(); notice.value = c.value.audioFail }
  }
}
async function copy() {
  try { await navigator.clipboard.writeText(encoded.value.code); notice.value = c.value.copied }
  catch { notice.value = c.value.copyFail }
}
watch([message, speed, frequency], () => { stop(); notice.value = '' })
function onVisibility() { if (document.hidden) stop() }
onMounted(() => { clockTimer = setInterval(() => { now.value = new Date() }, 1000); document.addEventListener('visibilitychange', onVisibility) })
onBeforeUnmount(() => { stop(); clearInterval(clockTimer); document.removeEventListener('visibilitychange', onVisibility) })
</script>

<template>
  <div class="signal-page"><div class="container"><SiteNav />
    <main class="experience-main">
      <header class="experience-heading"><p class="eyebrow">// SIGNAL LAB · 001</p><h1>{{ c.labTitle }}</h1><p>{{ c.labSubtitle }}</p></header>
      <div class="signal-console">
        <div class="signal-input-panel">
          <label for="signal-message">{{ c.input }} <span class="field-count">{{ message.length }}/120</span></label>
          <textarea id="signal-message" v-model="message" maxlength="120" spellcheck="false" autocapitalize="characters" aria-describedby="signal-hint signal-invalid" :aria-invalid="Boolean(encoded.unsupported.length)" />
          <p id="signal-hint" class="field-note">{{ c.inputHint }}</p>
          <div class="signal-samples" role="group" :aria-label="c.samples"><button v-for="sample in ['CQ CQ DE YUASHIE', 'HELLO WORLD', '73']" :key="sample" type="button" @click="message = sample">{{ sample }}</button></div>
          <div class="signal-settings"><label for="signal-speed">{{ c.speed }} <strong>{{ speed }} WPM</strong><input id="signal-speed" v-model.number="speed" type="range" min="5" max="30"></label><label for="signal-tone">{{ c.tone }} <strong>{{ frequency }} Hz</strong><input id="signal-tone" v-model.number="frequency" type="range" min="400" max="900" step="50"></label></div>
        </div>
        <div class="signal-output-panel" :class="{ transmitting: playing }">
          <div class="signal-output-heading"><span>{{ c.output }}</span><span class="signal-status" aria-hidden="true">{{ playing ? 'AUDIO' : 'CW' }}</span></div>
          <output class="morse-output" for="signal-message">{{ encoded.code || '—' }}</output>
          <p id="signal-invalid" class="signal-invalid" role="status">{{ encoded.unsupported.length ? c.unsupported + encoded.unsupported.join(' ') : '' }}</p>
          <div class="signal-actions"><button class="btn btn-primary" type="button" :disabled="!playable" @click="playing ? stop() : play()">{{ playing ? '■ ' + c.stop : '▶ ' + c.play }}</button><button class="btn btn-secondary" type="button" :disabled="!playable" @click="copy">{{ c.copy }}</button></div>
          <p class="field-note" role="status">{{ notice || c.privacy }}</p>
        </div>
      </div>
      <p class="signal-legend">{{ c.legend }}</p>
      <section class="clock-section"><div class="section-heading"><h2>{{ c.clock }}</h2><RouterLink to="/radio">{{ c.radio }} ↗</RouterLink></div><div class="clock-grid"><div v-for="clock in clocks" :key="clock.zone"><span>{{ clock.zone }}</span><time>{{ clock.time }}</time></div></div><p class="field-note">{{ c.clockNote }}</p></section>
    </main>
  </div><SiteFooter /></div>
</template>
