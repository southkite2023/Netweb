<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const canvas = ref(null)
const attempt = ref(0)
const host = ref(null)
const visible = ref(false)
const ready = ref(false)
const failed = ref(false)
const message = ref('我是水色小狗，点点我，一起逛逛吧。')
const animated = ref(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
const choices = [
  { name: 'neutral', label: '日常', line: '陪你一起逛逛。' },
  { name: 'blush', label: '害羞', line: '被你发现我在偷偷看你啦。' },
  { name: 'hearts', label: '喜欢', line: '今天也很喜欢这里！' },
  { name: 'stars', label: '星星眼', line: '哇，发现有趣的东西了！' },
  { name: 'wave', label: '招手', line: '嗨！欢迎来到 YUASHIE。' },
]
let app = null
let model = null
let resizeObserver = null
let generation = 0
let runtimePromise = null
let expressionRequest = 0
let assetsPromise = null
let modelBlobURL = null
let initializing = null
const MODEL_URL = '/assets/live2d/mizuiro/model.model3.json'

function loadModelAssets() {
  if (!assetsPromise) assetsPromise = (async () => {
    // Retain the original URL for relative texture, motion and expression paths.
    const url = new URL(MODEL_URL, window.location.href).href
    if (!window.DecompressionStream) return url
    try {
      const [response, compressed] = await Promise.all([
        fetch(url), fetch('/assets/live2d/mizuiro/model.moc3.gz'),
      ])
      if (!response.ok || !compressed.ok) throw new Error('Model download failed')
      const settings = await response.json()
      // A server may already decode Content-Encoding: gzip. Avoid decoding twice.
      const data = await compressed.arrayBuffer()
      const bytes = new Uint8Array(data)
      const decoded = bytes[0] === 0x1f && bytes[1] === 0x8b
        ? await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
        : data
      const header = new Uint8Array(decoded, 0, 4)
      if (String.fromCharCode(...header) !== 'MOC3') throw new Error('Invalid model data')
      modelBlobURL = URL.createObjectURL(new Blob([decoded], { type: 'application/octet-stream' }))
      return { ...settings, url, FileReferences: { ...settings.FileReferences, Moc: modelBlobURL } }
    } catch (error) {
      // Older browsers and transient compressed-download failures use the raw export.
      assetsPromise = null
      return url
    }
  })()
  return assetsPromise
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    const timer = setTimeout(() => finish(new Error('Runtime loading timed out')), 15000)
    function finish(error) {
      clearTimeout(timer)
      script.onload = script.onerror = null
      if (error) { script.remove(); reject(error) } else resolve()
    }
    script.onload = () => finish()
    script.onerror = () => finish(new Error(`Cannot load ${src}`))
    document.head.appendChild(script)
  })
}
function loadRuntime() {
  if (!runtimePromise) runtimePromise = (async () => {
    await Promise.all([
      window.Live2DCubismCore || loadScript('/assets/live2d/runtime/live2dcubismcore.min.js'),
      window.PIXI || loadScript('/assets/live2d/runtime/pixi.min.js'),
    ])
    if (!window.PIXI.live2d) await loadScript('/assets/live2d/runtime/cubism4.min.js')
  })().catch(error => { runtimePromise = null; throw error })
  return runtimePromise
}
function fitModel() {
  if (!model || !host.value) return
  const w = host.value.clientWidth
  const h = host.value.clientHeight
  if (!w || !h) return
  app.renderer.resize(w, h)
  model.scale.set(Math.min(w * 1.7 / model.internalModel.width, h * 3 / model.internalModel.height))
  model.anchor.set(.5, 0)
  model.position.set(w / 2, -h * .05)
  app.renderer.render(app.stage)
}
function setAnimation() {
  if (!app) return
  if (visible.value && animated.value) app.start()
  else { app.stop(); app.renderer.render(app.stage) }
}
function init() {
  if (!initializing) initializing = initialize().finally(() => { initializing = null })
  return initializing
}
async function initialize() {
  const ticket = ++generation
  attempt.value = ticket
  failed.value = false
  ready.value = false
  try {
    await nextTick()
    const [, settings] = await Promise.all([loadRuntime(), loadModelAssets()])
    if (ticket !== generation) return
    const PIXI = window.PIXI
    app = new PIXI.Application({ view: canvas.value, width: host.value.clientWidth, height: host.value.clientHeight, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) })
    app.ticker.maxFPS = 30
    const source = typeof settings === 'string' ? settings : new PIXI.live2d.Cubism4ModelSettings(settings)
    // PIXI's legacy URL helper corrupts blob URLs; use the browser URL resolver.
    if (typeof source !== 'string') source.resolveURL = path => new URL(path, source.url).href
    const loaded = await PIXI.live2d.Live2DModel.from(source, { autoInteract: false })
    if (ticket !== generation) { loaded.destroy(); return }
    model = loaded
    // Warm interaction expressions as well as the model, textures and idle motion.
    const expressions = model.internalModel.motionManager.expressionManager
    if (expressions) await Promise.allSettled(expressions.definitions.map((_, index) => expressions.loadExpression(index)))
    if (ticket !== generation) return
    // The supplied X hotkey hides the model's built-in information card.
    // The original model still contains the information card and creator credits.
    model.internalModel.coreModel.setParameterValueById('Param121', 30)
    model.internalModel.coreModel.saveParameters()
    model.update(0)
    app.stage.addChild(model)
    fitModel()
    setAnimation()
    ready.value = true
    resizeObserver = new ResizeObserver(() => {
      if (!visible.value || !host.value || !app) return
      fitModel()
    })
    resizeObserver.observe(host.value)
    if (visible.value) window.addEventListener('pointermove', follow, { passive: true })
  } catch (error) {
    if (ticket !== generation) return
    console.error('[Live2D]', error)
    dispose()
    failed.value = true
  }
}
function follow(event) {
  if (animated.value && event.pointerType !== 'touch') model?.focus(event.clientX, event.clientY)
}
async function choose(choice) {
  if (!model) return
  const current = model
  const request = ++expressionRequest
  try {
    const applied = await current.expression(choice.name)
    if (current !== model || request !== expressionRequest) return
    if (!applied) throw new Error('Expression unavailable')
    message.value = choice.line
    if (!animated.value) { current.update(1000); app.renderer.render(app.stage) }
  } catch (error) {
    if (current === model) message.value = '这个表情暂时没加载成功，再试一次吧。'
  }
}
function interact(event) {
  if (!ready.value) return
  const rect = host.value.getBoundingClientRect()
  const choice = event.clientY < rect.top + rect.height * .55
    ? choices[1 + Math.floor(Math.random() * 3)] : choices[4]
  choose(choice)
}
function dispose() {
  window.removeEventListener('pointermove', follow)
  resizeObserver?.disconnect()
  resizeObserver = null
  app?.destroy(false, { children: true, texture: true, baseTexture: true })
  app = null
  model = null
  ready.value = false
}
function hide() {
  visible.value = false
  window.removeEventListener('pointermove', follow)
  app?.stop()
}
async function show() {
  visible.value = true
  message.value = '我是水色小狗，点点我，一起逛逛吧。'
  if (model && ready.value) {
    await nextTick()
    fitModel()
    setAnimation()
    window.addEventListener('pointermove', follow, { passive: true })
  } else await init()
}
function retry() { if (initializing) return; dispose(); init() }
onMounted(init)
onBeforeUnmount(() => {
  ++generation
  dispose()
  // Also release a blob created by an outstanding background download.
  assetsPromise?.then(() => { if (modelBlobURL) URL.revokeObjectURL(modelBlobURL) })
})
</script>

<template>
  <aside class="live2d-companion" :class="{ 'is-hidden': !visible }" :inert="!visible" :aria-hidden="!visible" aria-label="水色小狗看板娘">
    <button class="live2d-close" type="button" aria-label="隐藏看板娘" @click="hide">×</button>
    <div v-if="ready" class="live2d-bubble" aria-live="polite">{{ message }}</div>
    <div ref="host" class="live2d-stage" role="button" :tabindex="ready ? 0 : -1" aria-label="与水色小狗互动，点击摸摸，回车招手" @pointerdown="interact" @keydown.enter.prevent="choose(choices[4])" @keydown.space.prevent="choose(choices[1])">
      <canvas :key="attempt" ref="canvas" aria-hidden="true" />
    </div>
    <div v-if="!ready" class="live2d-status" role="status">
      <template v-if="!failed">水色小狗赶来中…</template>
      <template v-else>加载失败 <button type="button" @click="retry">重新召唤</button></template>
    </div>
  </aside>
  <button v-if="!visible" class="live2d-restore" type="button" aria-label="召唤看板娘" @click="show"><span aria-hidden="true">✦</span> 召唤看板娘</button>
</template>

<style scoped>
.live2d-companion{position:fixed;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));z-index:34;width:min(260px,calc(100vw - 24px));height:min(280px,42dvh);pointer-events:none;filter:drop-shadow(0 12px 22px #0003)}
.live2d-companion.is-hidden{visibility:hidden;pointer-events:none}
.live2d-stage{position:absolute;inset:66px 0 0;pointer-events:auto;cursor:pointer;overflow:hidden;outline-offset:-3px}.live2d-stage canvas{width:100%!important;height:100%!important;display:block}
.live2d-close{position:absolute;right:0;top:0;z-index:3;width:36px;height:36px;border:1px solid var(--line);border-radius:50%;background:var(--bg-soft);color:var(--text);font-size:22px;cursor:pointer;pointer-events:auto}
.live2d-bubble{position:absolute;z-index:2;left:0;right:44px;top:0;padding:10px 13px;border:1px solid var(--line);border-radius:14px 14px 14px 4px;background:var(--bg-soft);color:var(--text);font-size:12px;line-height:1.55;box-shadow:0 4px 18px #0002}
.live2d-status{position:absolute;left:0;right:0;bottom:12px;text-align:center;padding:12px;background:var(--bg-soft);border:1px solid var(--line);border-radius:12px;color:var(--text);font-size:12px;pointer-events:auto}
.live2d-status button{min-height:32px;padding:4px 9px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--text);font:inherit;font-size:11px;cursor:pointer}
.live2d-restore{position:fixed;left:max(16px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));z-index:35;max-width:calc(100vw - 32px);background:var(--bg-soft);border:1px solid var(--accent);color:var(--text);font:inherit;font-size:.875rem;border-radius:30px;min-height:44px;padding:8px 16px;box-shadow:0 6px 24px #0003;cursor:pointer;display:flex;align-items:center;gap:8px}
button:focus-visible,.live2d-stage:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
@media (max-width:760px){.live2d-companion{left:max(8px,env(safe-area-inset-left));width:180px;height:min(220px,36dvh)}.live2d-bubble{font-size:11px;padding:8px 10px}}
</style>
