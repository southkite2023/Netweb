<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const booted = ref(false)
const revealed = ref(false)
const now = ref('')
const integrity = ref(97.3)
let bootTimer

const integrityLabel = computed(() => `${integrity.value.toFixed(2)}%`)

function getIntegrity() {
  const key = 'yuashie.archive.integrity'
  const stored = Number(localStorage.getItem(key))
  const previous = Number.isFinite(stored) && stored > 0 && stored <= 100 ? stored : 97.3
  const decay = Math.random() * 0.02 + 0.01
  const next = Math.max(0.01, previous - decay)
  localStorage.setItem(key, next.toFixed(4))
  return next
}

function openIdentity() {
  revealed.value = true
  window.setTimeout(() => router.push('/projects/000/identity'), 520)
}

function leaveArchive() {
  router.push('/')
}

onMounted(() => {
  integrity.value = getIntegrity()
  now.value = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date()).replace(',', '')
  bootTimer = window.setTimeout(() => {
    booted.value = true
  }, 720)
})

onBeforeUnmount(() => window.clearTimeout(bootTimer))
</script>

<template>
  <main class="archive-page" :class="{ 'is-revealing': revealed }">
    <div class="noise" aria-hidden="true"></div>
    <div class="scanline" aria-hidden="true"></div>

    <section class="archive-shell">
      <header class="archive-header">
        <button class="archive-exit" type="button" @click="leaveArchive">×</button>
        <div>
          <p class="archive-kicker">YUASHIE PERSONAL NETWORK</p>
          <h1>PROJECT 000</h1>
        </div>
        <span class="archive-status"><i></i> HIDDEN NODE</span>
      </header>

      <div class="archive-divider"></div>

      <section class="terminal-panel">
        <div class="terminal-line dim">[ ACCESS GATE / UNLISTED RESOURCE ]</div>
        <div class="terminal-line"><span>&gt;</span> handshake accepted</div>
        <div class="terminal-line"><span>&gt;</span> mounting archive://yuashie/000</div>
        <div class="terminal-line"><span>&gt;</span> integrity check <b>{{ integrityLabel }}</b></div>
        <div class="terminal-line" :class="{ ready: booted }">
          <span>&gt;</span> {{ booted ? 'archive mounted.' : 'decrypting...' }}
        </div>
      </section>

      <section v-if="booted" class="archive-content">
        <div class="identity-card">
          <div class="identity-title">
            <span>IDENTITY RECORD</span>
            <strong>000-A</strong>
          </div>

          <dl>
            <div><dt>IDENTITY</dt><dd>YUASHIE</dd></div>
            <div><dt>STATUS</dt><dd class="online">ONLINE</dd></div>
            <div><dt>NODE</dt><dd>PERSONAL / PRIMARY</dd></div>
            <div><dt>MEMORY INTEGRITY</dt><dd>{{ integrityLabel }}</dd></div>
            <div><dt>SESSION</dt><dd>{{ now }}</dd></div>
          </dl>
        </div>

        <div class="archive-note">
          <span class="note-index">// 000</span>
          <p>这个页面没有被链接，也不属于公开项目列表。</p>
          <p>如果你找到了这里，说明你没有只看见网站想让你看见的部分。</p>
        </div>

        <div class="archive-grid">
          <article class="archive-module disabled">
            <span>ARCHIVE / EARLY BUILDS</span>
            <h2>早期版本</h2>
            <p>旧页面、被废弃的设计与尚未整理的残片。</p>
            <small>INDEXING...</small>
          </article>

          <article class="archive-module disabled">
            <span>ARCHIVE / FAILED ROUTES</span>
            <h2>未完成项目</h2>
            <p>没有被删除，只是暂时停止生长。</p>
            <small>LOCKED</small>
          </article>

          <button class="archive-module identity-module" type="button" @click="openIdentity">
            <span>IDENTITY_BACKUP</span>
            <h2>AVAILABLE</h2>
            <p>检测到一个未初始化的身份镜像。</p>
            <small>OPEN RECORD ↗</small>
          </button>
        </div>
      </section>

      <footer class="archive-footer">
        <span>NOINDEX / UNLISTED / LOCAL TRACE ENABLED</span>
        <span>NODE 000</span>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.archive-page {
  --archive-green: #91ffb6;
  --archive-text: #dbe7df;
  --archive-dim: #66756c;
  min-height: 100vh;
  overflow: hidden;
  position: relative;
  color: var(--archive-text);
  background:
    radial-gradient(circle at 70% 10%, rgba(86, 255, 145, 0.08), transparent 34rem),
    #050807;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}

.archive-page::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px);
  background-size: 100% 4px;
  opacity: .55;
}

.noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: .045;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E");
}

.scanline {
  position: fixed;
  left: 0;
  right: 0;
  height: 110px;
  top: -140px;
  pointer-events: none;
  background: linear-gradient(transparent, rgba(145,255,182,.035), transparent);
  animation: sweep 8s linear infinite;
}

.archive-shell {
  width: min(1120px, calc(100% - 36px));
  margin: 0 auto;
  padding: 48px 0 30px;
}

.archive-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 20px;
  align-items: center;
}

.archive-exit {
  width: 42px;
  height: 42px;
  border: 1px solid #26322b;
  background: rgba(255,255,255,.015);
  color: #8f9d94;
  font: inherit;
  font-size: 24px;
  cursor: pointer;
}

.archive-exit:hover { color: var(--archive-green); border-color: #41604b; }
.archive-kicker { margin: 0 0 7px; color: var(--archive-dim); font-size: 11px; letter-spacing: .21em; }
.archive-header h1 { margin: 0; font-size: clamp(28px, 5vw, 56px); font-weight: 500; letter-spacing: .06em; }
.archive-status { justify-self: end; color: #819087; font-size: 11px; letter-spacing: .12em; }
.archive-status i { display: inline-block; width: 7px; height: 7px; margin-right: 8px; border-radius: 50%; background: var(--archive-green); box-shadow: 0 0 16px var(--archive-green); }
.archive-divider { height: 1px; margin: 26px 0; background: linear-gradient(90deg, #314137, transparent); }

.terminal-panel {
  min-height: 136px;
  padding: 20px 22px;
  border: 1px solid #1f2b24;
  background: rgba(5, 12, 8, .63);
  box-shadow: inset 0 0 60px rgba(60,255,120,.018);
  line-height: 1.75;
  font-size: 13px;
}

.terminal-line { color: #93a49a; }
.terminal-line span { color: var(--archive-green); margin-right: 8px; }
.terminal-line b { color: #e2ffe9; font-weight: 500; }
.terminal-line.dim { color: #46534b; }
.terminal-line.ready { color: var(--archive-green); }

.archive-content { animation: contentIn .6s ease both; }
.identity-card {
  margin-top: 22px;
  border: 1px solid #25332a;
  background: linear-gradient(135deg, rgba(255,255,255,.025), rgba(38,90,52,.025));
}
.identity-title { display: flex; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #202b24; color: #718078; font-size: 11px; letter-spacing: .16em; }
.identity-title strong { color: var(--archive-green); font-weight: 500; }
dl { margin: 0; }
dl div { display: grid; grid-template-columns: minmax(150px, .8fr) 1.8fr; padding: 13px 18px; border-bottom: 1px solid rgba(47,63,53,.55); }
dl div:last-child { border-bottom: 0; }
dt { color: #59675f; font-size: 11px; letter-spacing: .08em; }
dd { margin: 0; color: #c5d2ca; font-size: 12px; }
dd.online { color: var(--archive-green); }

.archive-note { margin: 44px 0; max-width: 720px; }
.note-index { display: block; margin-bottom: 15px; color: var(--archive-green); font-size: 11px; }
.archive-note p { margin: 6px 0; color: #9eaaa2; font-family: system-ui, sans-serif; font-size: clamp(15px, 2vw, 18px); line-height: 1.8; }

.archive-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.archive-module { min-height: 210px; padding: 22px; border: 1px solid #202d25; background: rgba(255,255,255,.018); text-align: left; color: inherit; font: inherit; }
.archive-module span { color: #536158; font-size: 10px; letter-spacing: .1em; }
.archive-module h2 { margin: 35px 0 10px; color: #cbd6cf; font-family: system-ui, sans-serif; font-size: 22px; font-weight: 500; }
.archive-module p { color: #748078; font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.7; }
.archive-module small { display: block; margin-top: 24px; color: #4d5a52; font-size: 10px; letter-spacing: .1em; }
.archive-module.disabled { opacity: .62; }
.identity-module { cursor: pointer; transition: border-color .2s ease, background .2s ease, transform .2s ease; }
.identity-module:hover { border-color: #487155; background: rgba(91,255,141,.045); transform: translateY(-2px); }
.identity-module:hover h2, .identity-module:hover small { color: var(--archive-green); }

.archive-footer { display: flex; justify-content: space-between; margin-top: 54px; padding-top: 18px; border-top: 1px solid #1a251e; color: #3f4a43; font-size: 9px; letter-spacing: .11em; }
.is-revealing { animation: glitchOut .55s steps(2, end) both; }

@keyframes sweep { to { transform: translateY(calc(100vh + 280px)); } }
@keyframes contentIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes glitchOut { 20% { transform: translateX(4px); filter: contrast(1.5); } 45% { transform: translateX(-7px); } 70% { opacity: .7; } 100% { opacity: 0; transform: scale(1.015); } }

@media (max-width: 760px) {
  .archive-shell { width: min(100% - 24px, 1120px); padding-top: 24px; }
  .archive-header { grid-template-columns: auto 1fr; }
  .archive-status { grid-column: 2; justify-self: start; }
  .archive-grid { grid-template-columns: 1fr; }
  dl div { grid-template-columns: 1fr; gap: 5px; }
  .archive-footer { gap: 20px; flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  .scanline, .archive-content, .is-revealing { animation: none; }
}
</style>
