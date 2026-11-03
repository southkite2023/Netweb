<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { weather, stopWeather } from '../lib/weather'
const canvas = ref(null)
let frame = 0, last = 0, width = 0, height = 0, particles = [], masks = [], dirty = true, maskTime = 0
let ctx, observer, motion
function resize() {
  width = innerWidth; height = innerHeight
  const ratio = Math.min(devicePixelRatio || 1, 1.5)
  canvas.value.width = width * ratio; canvas.value.height = height * ratio
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); dirty = true
}
function invalidate() { dirty = true }
// Exclude actual text lines and controls, including newly opened panels.
function measure() {
  masks = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    if (!node.textContent.trim() || node.parentElement?.closest('script,style,canvas,[aria-hidden="true"]')) continue
    const range = document.createRange(); range.selectNodeContents(node)
    for (const r of range.getClientRects()) if (r.bottom > 0 && r.top < height && r.width) masks.push(r)
  }
  document.querySelectorAll('button,input,textarea,select,[role="dialog"],[role="button"],iframe').forEach(el => {
    const r = el.getBoundingClientRect(); if (r.bottom > 0 && r.top < height) masks.push(r)
  })
  dirty = false
}
function seed() {
  particles = Array.from({ length: weather.value === 'rain' ? 80 : 7 }, () => ({ x: Math.random() * width, y: Math.random() * height, speed: 180 + Math.random() * 220, length: 8 + Math.random() * 12, delay: Math.random() * 8 }))
}
function tick(time) {
  frame = 0
  if (!weather.value || document.hidden || motion.matches) return
  const dt = Math.min((time - last) / 1000 || 0, .05); last = time
  ctx.clearRect(0, 0, width, height)
  if (dirty || time - maskTime > 400) { measure(); maskTime = time }
  for (const p of particles) {
    const rain = weather.value === 'rain'
    if (!rain && (p.delay -= dt) > 0) continue
    const speed = rain ? p.speed : p.speed * 1.8
    p.x += dt * speed * (rain ? -.25 : -.8); p.y += dt * speed
    const length = rain ? p.length : 80
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + length * (rain ? .25 : .8), p.y - length)
    ctx.strokeStyle = rain ? 'rgba(45,116,162,.32)' : 'rgba(184,214,255,.48)'
    ctx.lineWidth = rain ? 1 : 1.4; ctx.stroke()
    if (p.y > height + length || p.x < -length) { p.x = Math.random() * (width + height * .8); p.y = -length; p.delay = Math.random() * 6 }
  }
  // Erase particles over text/controls instead of merely making them translucent.
  for (const r of masks) ctx.clearRect(r.left - 5, r.top - 4, r.width + 10, r.height + 8)
  frame = requestAnimationFrame(tick)
}
function restart() {
  cancelAnimationFrame(frame); frame = 0
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  if (weather.value && !document.hidden && !motion.matches) { last = performance.now(); dirty = true; frame = requestAnimationFrame(tick) }
}
function reduceMotion() { if (motion.matches) stopWeather(); restart() }
watch(weather, () => { seed(); restart() })
onMounted(() => {
  ctx = canvas.value.getContext('2d'); if (!ctx) return
  motion = matchMedia('(prefers-reduced-motion: reduce)'); resize(); seed(); restart()
  observer = new MutationObserver(invalidate); observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  window.addEventListener('resize', resize); window.addEventListener('scroll', invalidate, true)
  document.addEventListener('visibilitychange', restart); motion.addEventListener('change', reduceMotion)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame); observer?.disconnect()
  window.removeEventListener('resize', resize); window.removeEventListener('scroll', invalidate, true)
  document.removeEventListener('visibilitychange', restart); motion?.removeEventListener('change', reduceMotion)
})
</script>
<template><canvas ref="canvas" class="weather-effect" aria-hidden="true" /></template>
<style scoped>.weather-effect{position:fixed;inset:0;width:100%;height:100%;z-index:30;pointer-events:none!important;contain:strict}</style>
