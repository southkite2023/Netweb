<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const canvas = ref(null)
const host = ref(null)
const visible = ref(localStorage.getItem('yuashie-live2d-hidden') !== '1')
const ready = ref(false)
const failed = ref(false)
const message = ref('晚上好。要一起看看今天的网站吗？')
let app = null
let model = null
let resizeObserver = null
const MODEL_URL = '/live2d/yuashie/Yuashie_Live2D_layered_starter.model3.json'
const lines = ['欢迎来到 YUASHIE。','别一直盯着我看啦。','项目还在持续更新中。','今天也要无限进步。','点击右上角可以暂时把我藏起来。']

function waitForRuntime(timeout = 12000) {
  const started = performance.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      if (window.PIXI?.live2d?.Live2DModel && window.Live2DCubismCore) return resolve()
      if (performance.now() - started > timeout) return reject(new Error('Live2D runtime unavailable'))
      requestAnimationFrame(check)
    }
    check()
  })
}
function fitModel() {
  if (!model || !host.value) return
  const w = host.value.clientWidth
  const h = host.value.clientHeight
  if (!w || !h) return
  const scale = Math.min((w * .92) / model.width, (h * .98) / model.height)
  model.scale.set(scale)
  model.anchor?.set?.(.5, 1)
  model.x = w / 2
  model.y = h + 8
}
async function init() {
  if (!visible.value || app) return
  failed.value = false
  try {
    await nextTick()
    await waitForRuntime()
    const PIXI = window.PIXI
    app = new PIXI.Application({ view: canvas.value, width: host.value.clientWidth, height: host.value.clientHeight, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) })
    model = await PIXI.live2d.Live2DModel.from(MODEL_URL, { autoInteract: false })
    app.stage.addChild(model)
    fitModel()
    ready.value = true
    resizeObserver = new ResizeObserver(() => {
      if (!host.value || !app) return
      app.renderer.resize(host.value.clientWidth, host.value.clientHeight)
      fitModel()
    })
    resizeObserver.observe(host.value)
  } catch (error) {
    console.error('[Live2D]', error)
    failed.value = true
  }
}
function follow(event) { model?.focus?.(event.clientX, event.clientY) }
function interact() { if (model) message.value = lines[Math.floor(Math.random() * lines.length)] }
function destroy() {
  resizeObserver?.disconnect()
  resizeObserver = null
  model?.destroy?.()
  model = null
  app?.destroy?.(true, { children: true, texture: false, baseTexture: false })
  app = null
  ready.value = false
}
function hide() { visible.value = false; localStorage.setItem('yuashie-live2d-hidden', '1'); destroy() }
async function show() { visible.value = true; localStorage.removeItem('yuashie-live2d-hidden'); await init() }
onMounted(init)
onBeforeUnmount(destroy)
</script>

<template>
  <aside v-if="visible" class="live2d-companion" aria-label="Yuashie Live2D companion">
    <button class="live2d-close" type="button" aria-label="隐藏 Live2D" @click="hide">×</button>
    <div v-if="ready" class="live2d-bubble" aria-live="polite">{{ message }}</div>
    <div ref="host" class="live2d-stage" @pointermove="follow" @pointerdown="interact">
      <canvas ref="canvas" />
      <div v-if="!ready && !failed" class="live2d-status">LOADING LIVE2D…</div>
      <div v-else-if="failed" class="live2d-status live2d-error">LIVE2D OFFLINE</div>
    </div>
  </aside>
  <button v-else class="live2d-restore" type="button" aria-label="显示 Live2D" @click="show">✦</button>
</template>

<style scoped>
.live2d-companion{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));z-index:34;width:min(330px,32vw);height:min(520px,68vh);pointer-events:none;filter:drop-shadow(0 18px 32px #0005)}
.live2d-stage{position:absolute;inset:0;pointer-events:auto;cursor:pointer;overflow:hidden}.live2d-stage canvas{width:100%!important;height:100%!important;display:block}
.live2d-close{position:absolute;right:6px;top:6px;z-index:3;width:32px;height:32px;border:1px solid color-mix(in srgb,var(--line) 80%,transparent);border-radius:50%;background:color-mix(in srgb,var(--bg-soft) 82%,transparent);backdrop-filter:blur(12px);color:var(--muted);font:20px/1 inherit;cursor:pointer;pointer-events:auto;opacity:.55;transition:.2s ease}.live2d-close:hover{opacity:1;color:var(--text);border-color:var(--accent)}
.live2d-bubble{position:absolute;z-index:2;right:54px;top:18px;max-width:210px;padding:10px 13px;border:1px solid color-mix(in srgb,var(--accent) 38%,var(--line));border-radius:14px 14px 4px 14px;background:color-mix(in srgb,var(--bg-soft) 80%,transparent);backdrop-filter:blur(14px);color:var(--text);font-size:12px;line-height:1.55;letter-spacing:.02em;box-shadow:0 10px 30px #0003;pointer-events:none}
.live2d-status{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);font-size:10px;letter-spacing:.18em;color:var(--muted);white-space:nowrap}.live2d-error{color:#d97777}
.live2d-restore{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));z-index:34;width:44px;height:44px;border-radius:50%;border:1px solid var(--accent);background:var(--bg-soft);color:var(--accent);box-shadow:0 8px 30px #0004;cursor:pointer;font-size:18px}
@media (max-width:760px){.live2d-companion{width:190px;height:310px;right:-8px;bottom:0}.live2d-bubble{right:34px;top:8px;max-width:145px;font-size:10px;padding:8px 10px}.live2d-close{width:30px;height:30px;right:2px;top:2px}}
@media (prefers-reduced-motion:reduce){.live2d-companion{display:none}.live2d-restore{display:none}}
</style>
