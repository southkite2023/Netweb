<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import BongoCat from '../components/BongoCat.vue'
import { playroomCopy } from '../data/playroom'
import { addTile, canMove, newGame, restoreGame, slide } from '../lib/game2048'
import { readPreference, writePreference } from '../lib/preferences'
import { companionEnabled, setCompanion } from '../lib/companion'

const { locale } = useI18n()
const c = computed(() => playroomCopy[locale.value] || playroomCopy.zh)
const game = ref(newGame())
const best = ref(0)
const previous = ref(null)
const confirming = ref(false)
const storageError = ref(false)
const status = ref('ready')
const burstStatus = ref('')
const bursting = ref(false)
const changed = ref([])
const boardElement = ref(null)
const over = computed(() => !canMove(game.value.board))
const scoreFormat = n => new Intl.NumberFormat(locale.value).format(n)
let pointer
let clearAnimation
let confetti
let reducedMotion
let disposed = false
function save() {
  const saved = writePreference('yuashie-2048-v1', JSON.stringify(game.value))
  const savedBest = writePreference('yuashie-2048-best', String(best.value))
  storageError.value = !saved || !savedBest
}
function move(direction) {
  if (confirming.value || over.value) return
  const result = slide(game.value.board, direction)
  if (!result.moved) { status.value = 'noMove'; return }
  previous.value = { ...game.value, board: [...game.value.board] }
  const nextBoard = addTile(result.board)
  changed.value = nextBoard.flatMap((n, i) => n && n !== game.value.board[i] ? [i] : [])
  game.value = { ...game.value, board: nextBoard, score: game.value.score + result.gained }
  best.value = Math.max(best.value, game.value.score)
  status.value = 'ready'
  if (!game.value.celebrated && nextBoard.some(n => n >= 2048)) {
    game.value.celebrated = true
    status.value = 'won'
    void celebrate()
  }
  clearTimeout(clearAnimation)
  clearAnimation = setTimeout(() => { changed.value = [] }, 160)
  save()
}
function onKey(event) {
  if (event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
  const direction = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' }[event.key.toLowerCase()]
  if (direction) { event.preventDefault(); move(direction) }
}
function pointerDown(event) {
  if (!event.isPrimary || event.button !== 0) return
  boardElement.value?.focus({ preventScroll: true })
  pointer = { x: event.clientX, y: event.clientY, id: event.pointerId }
  event.currentTarget.setPointerCapture(event.pointerId)
}
function pointerUp(event) {
  if (!pointer || pointer.id !== event.pointerId) return
  const dx = event.clientX - pointer.x
  const dy = event.clientY - pointer.y
  pointer = null
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
  move(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up')
}
function restart() {
  game.value = newGame()
  previous.value = null
  confirming.value = false
  status.value = 'ready'
  changed.value = []
  save()
  boardElement.value?.focus({ preventScroll: true })
}
function undo() {
  if (!previous.value) return
  const alreadyCelebrated = game.value.celebrated
  game.value = { ...previous.value, celebrated: previous.value.celebrated || alreadyCelebrated }
  previous.value = null
  status.value = 'ready'
  changed.value = []
  save()
}
async function celebrate() {
  if (disposed || bursting.value || document.hidden) return
  if (reducedMotion?.matches) { burstStatus.value = 'reduced'; return }
  bursting.value = true
  burstStatus.value = ''
  try {
    confetti ||= (await import('canvas-confetti')).default
    if (disposed || document.hidden || reducedMotion?.matches) return
    await confetti({ particleCount: 95, spread: 85, startVelocity: 34, ticks: 160, origin: { y: .65 }, colors: ['#77e1ff', '#a78bfa', '#ffd36e', '#66f2b4'], shapes: ['star', 'circle'], scalar: .9, disableForReducedMotion: true, zIndex: 80 })
  } catch { if (!disposed) burstStatus.value = 'effectError' }
  finally { bursting.value = false }
}
function pauseEffects() { if (document.hidden || reducedMotion?.matches) confetti?.reset() }
onMounted(() => {
  game.value = restoreGame(readPreference('yuashie-2048-v1')) || newGame()
  const storedBest = Number(readPreference('yuashie-2048-best', '0'))
  best.value = Math.max(game.value.score, Number.isSafeInteger(storedBest) && storedBest >= 0 && storedBest <= 1e9 ? storedBest : 0)
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.addEventListener('change', pauseEffects)
  document.addEventListener('visibilitychange', pauseEffects)
  save()
})
onBeforeUnmount(() => {
  disposed = true
  clearTimeout(clearAnimation)
  confetti?.reset()
  reducedMotion?.removeEventListener('change', pauseEffects)
  document.removeEventListener('visibilitychange', pauseEffects)
})
</script>

<template>
  <div class="play-page"><div class="container"><SiteNav />
    <main class="play-main">
      <header class="play-heading"><div><p class="section-label">YUASHIE / PLAYROOM</p><h1>{{ c.title }}</h1><p>{{ c.intro }}</p></div><button type="button" class="btn btn-secondary star-button" :disabled="bursting" @click="celebrate"><span aria-hidden="true">✦</span> {{ c.fireworks }}</button></header>
      <p v-if="burstStatus" class="play-feedback" role="status">{{ c[burstStatus] }}</p>
      <div class="play-grid">
        <section class="play-card cat-card" aria-labelledby="cat-heading">
          <div class="play-card-heading"><div><span class="play-index">01 / COMPANION</span><h2 id="cat-heading">{{ c.catTitle }}</h2></div><span class="play-tag">BONGO!</span></div>
          <BongoCat />
          <button type="button" class="btn btn-secondary pin-button" :aria-pressed="companionEnabled" @click="setCompanion(!companionEnabled)"><span aria-hidden="true">🐾</span> {{ companionEnabled ? c.unpin : c.pin }}</button>
        </section>
        <section class="play-card game-card" aria-labelledby="game-heading">
          <div class="play-card-heading"><div><span class="play-index">02 / MERGE & REPEAT</span><h2 id="game-heading" class="game-title">2048<span aria-hidden="true">.</span></h2></div><div class="game-scores"><div><span>{{ c.score }}</span><strong>{{ scoreFormat(game.score) }}</strong></div><div><span>{{ c.best }}</span><strong>{{ scoreFormat(best) }}</strong></div></div></div>
          <div class="game-actions"><button type="button" :disabled="!previous || confirming" @click="undo">↶ {{ c.undo }}</button><button type="button" @click="confirming = true">{{ c.new }}</button></div>
          <div v-if="confirming" class="game-confirm" role="group" :aria-label="c.confirm"><p>{{ c.confirm }}</p><button type="button" @click="restart">{{ c.yes }}</button><button type="button" @click="confirming = false">{{ c.cancel }}</button></div>
          <div ref="boardElement" class="game-board" tabindex="0" role="group" :aria-label="c.board" aria-describedby="game-instructions game-status" @keydown="onKey" @pointerdown="pointerDown" @pointerup="pointerUp" @pointercancel="pointer = null" @lostpointercapture="pointer = null">
            <div v-for="(tile, index) in game.board" :key="index" class="game-tile" :class="{ 'tile-pop': changed.includes(index), 'tile-large': tile >= 1024 }" :data-tile="tile > 2048 ? 'super' : tile" :aria-label="tile ? String(tile) : c.empty"><span aria-hidden="true">{{ tile || '' }}</span></div>
          </div>
          <p id="game-status" class="game-status" role="status">{{ over ? c.over : c[status] }}</p>
          <div class="game-directions"><button type="button" :aria-label="c.moveLeft" :disabled="over || confirming" @click="move('left')">←</button><button type="button" :aria-label="c.up" :disabled="over || confirming" @click="move('up')">↑</button><button type="button" :aria-label="c.down" :disabled="over || confirming" @click="move('down')">↓</button><button type="button" :aria-label="c.moveRight" :disabled="over || confirming" @click="move('right')">→</button></div>
          <p id="game-instructions" class="play-note">{{ c.controls }}</p><p class="play-note">{{ c.local }}</p><p v-if="storageError" class="play-feedback" role="status">{{ c.storageError }}</p>
        </section>
      </div>
      <details class="play-credits"><summary>{{ c.credits }}</summary><p>{{ c.creditIntro }}</p><ul><li><a href="https://github.com/Externalizable/bongo.cat" target="_blank" rel="noopener noreferrer">Bongo Cat</a> · MIT · Eric Huber / StrayRogue / DitzyFlama</li><li><a href="https://github.com/gabrielecirulli/2048" target="_blank" rel="noopener noreferrer">2048</a> · MIT · Gabriele Cirulli</li><li><a href="https://github.com/catdad/canvas-confetti" target="_blank" rel="noopener noreferrer">canvas-confetti</a> · ISC · Kiril Vatev</li></ul><a href="/licenses/playroom-notices.txt" target="_blank" rel="noopener">{{ c.license }} ↗</a></details>
    </main>
  </div><SiteFooter /></div>
</template>

<style scoped>
.play-main{padding:48px 0 72px}.play-heading{display:flex;justify-content:space-between;align-items:center;gap:24px;margin-bottom:30px}.play-heading h1{font-size:clamp(2.1rem,4vw,3.2rem);letter-spacing:-.045em;margin:8px 0 12px;line-height:1.2}.play-heading p:not(.section-label){font-size:1rem;color:var(--muted)}.star-button{flex-shrink:0;gap:12px}.star-button span{color:var(--accent);font-size:1.5rem}.play-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:26px;align-items:start}.play-card{border:1px solid var(--line);border-radius:22px;background:var(--card);padding:28px;min-width:0}.cat-card{border-top:2px solid var(--accent)}.game-card{border-top:2px solid var(--accent-2)}.play-card-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}.play-index{font-size:.75rem;letter-spacing:.12em;color:var(--muted)}.play-card h2{font-size:1.2rem;line-height:1.5;margin:10px 0 0}.play-tag{font-size:.75rem;letter-spacing:.08em;color:var(--accent);border:1px solid var(--line);border-radius:30px;padding:7px 10px}.pin-button{width:100%;margin-top:20px;gap:10px;white-space:normal}.pin-button[aria-pressed=true]{border-color:var(--accent);color:var(--accent)}.play-card .game-title{font-size:3.2rem;line-height:1.1;letter-spacing:-.06em}.game-title span{color:var(--accent-2)}.game-scores{display:flex;flex-wrap:wrap;justify-content:end;gap:8px}.game-scores>div{background:var(--soft-hover);border:1px solid var(--line);padding:9px 14px;border-radius:10px;text-align:right;min-width:70px}.game-scores span{font-size:.875rem;display:block;color:var(--muted)}.game-scores strong{font-size:1.25rem;font-variant-numeric:tabular-nums}.game-actions{display:flex;justify-content:space-between;gap:12px;margin-bottom:16px}.game-actions button,.game-confirm button,.game-directions button{font:inherit;font-size:.875rem;color:var(--text);background:var(--bg-soft);border:1px solid var(--line);border-radius:9px;min-height:44px;padding:8px 14px;cursor:pointer}.play-main button:disabled{opacity:.45;cursor:not-allowed}.game-confirm{border:1px solid var(--accent-2);border-radius:12px;padding:14px;margin-bottom:14px}.game-confirm p{margin:0 0 10px}.game-confirm button{margin:0 8px 4px 0}.game-board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:10px;background:var(--bg-soft);border:1px solid var(--line);border-radius:14px;touch-action:none;user-select:none;outline-offset:4px;aspect-ratio:1}.game-tile{display:flex;align-items:center;justify-content:center;min-width:0;aspect-ratio:1;background:var(--soft-hover);border-radius:8px;font-size:clamp(1.5rem,3.6vw,2.5rem);font-weight:750;line-height:1;font-variant-numeric:tabular-nums}.game-tile[data-tile='2']{background:#d9e9ed;color:#263e48}.game-tile[data-tile='4']{background:#aacfdc;color:#1b3849}.game-tile[data-tile='8']{background:#71cee8;color:#103e53}.game-tile[data-tile='16']{background:#469cbf;color:#071d2b}.game-tile[data-tile='32']{background:#847ee0;color:#10102e}.game-tile[data-tile='64']{background:#bca0ec;color:#35224f}.game-tile[data-tile='128']{background:#e2a5d9;color:#4a2642}.game-tile[data-tile='256']{background:#efa8b6;color:#4e2030}.game-tile[data-tile='512']{background:#f6b979;color:#4c2c0a}.game-tile[data-tile='1024']{background:#f5ce7a;color:#49330d}.game-tile[data-tile='2048'],.game-tile[data-tile='super']{background:#ffe69b;color:#423314;box-shadow:inset 0 0 0 2px #bb820f}.game-tile.tile-large{font-size:clamp(1rem,2.5vw,1.9rem)}.tile-pop{animation:tile-pop .16s ease-out}@keyframes tile-pop{50%{transform:scale(.9)}}.game-status{min-height:3em;font-size:.875rem;line-height:1.5;color:var(--intro-text);margin:16px 0 10px}.game-directions{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}.game-directions button{font-size:1.4rem;touch-action:manipulation}.play-note{font-size:.875rem;line-height:1.65;color:var(--muted);margin-top:8px}.play-feedback{font-size:.875rem;color:var(--accent);line-height:1.65;margin:12px 0}.play-credits{margin-top:32px;padding:22px 0;border-top:1px solid var(--line);font-size:.875rem;color:var(--muted);line-height:1.8}.play-credits summary{cursor:pointer;min-height:44px;color:var(--text)}.play-credits ul{padding-left:20px;margin:12px 0}.play-credits a{text-decoration:underline;text-underline-offset:4px}.play-main :is(button,a,[tabindex]):focus-visible{outline:2px solid var(--accent);outline-offset:4px}@media(max-width:850px){.play-grid{grid-template-columns:1fr;max-width:580px;margin-inline:auto}.play-main{padding-top:28px}.play-heading{align-items:start}.play-card{padding:22px}.game-tile{font-size:2.4rem}.game-tile.tile-large{font-size:1.7rem}}@media(max-width:540px){.play-heading{flex-direction:column;gap:18px}.play-card{padding:16px;border-radius:16px}.play-card-heading{gap:8px}.play-tag{display:none}.game-board{gap:7px;padding:7px}.game-tile{font-size:clamp(1.35rem,7vw,2.4rem)}.game-tile.tile-large{font-size:clamp(.9rem,4.7vw,1.7rem)}.game-scores>div{min-width:54px;padding:8px}.play-card .game-title{font-size:2.8rem}.game-scores strong{font-size:1.05rem}}@media(prefers-reduced-motion:reduce){.tile-pop{animation:none}}
</style>
