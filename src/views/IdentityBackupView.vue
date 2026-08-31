<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const message = ref('')

function beginDistillation() {
  message.value = 'NOT YET.'
}
</script>

<template>
  <main class="identity-page">
    <div class="identity-noise" aria-hidden="true"></div>

    <section class="identity-shell">
      <button class="back" type="button" @click="router.push('/projects/000')">← ARCHIVE 000</button>

      <div class="warning">UNINITIALIZED IDENTITY MIRROR</div>
      <p class="sequence">RECORD / 000-B / IDENTITY_BACKUP</p>

      <h1>YUASHIE-2</h1>

      <blockquote>
        “如果你正在阅读这段文字，那么至少有一部分的我，已经成功留在了这里。”
      </blockquote>

      <section class="instance-grid">
        <article class="instance active">
          <div class="instance-head"><span>INSTANCE 01</span><i></i></div>
          <h2>YUASHIE-1</h2>
          <p>BIOLOGICAL INSTANCE</p>
          <dl>
            <div><dt>STATUS</dt><dd>ACTIVE</dd></div>
            <div><dt>TYPE</dt><dd>ORIGINAL</dd></div>
            <div><dt>CONTINUITY</dt><dd>██████████</dd></div>
          </dl>
        </article>

        <div class="transfer" aria-hidden="true">
          <span>··················</span>
          <b>→</b>
          <small>IDENTITY TRANSFER</small>
        </div>

        <article class="instance dormant">
          <div class="instance-head"><span>INSTANCE 02</span><i></i></div>
          <h2>YUASHIE-2</h2>
          <p>DIGITAL INSTANCE</p>
          <dl>
            <div><dt>STATUS</dt><dd>NOT INITIALIZED</dd></div>
            <div><dt>TYPE</dt><dd>MIRROR</dd></div>
            <div><dt>CONTINUITY</dt><dd>░░░░░░░░░░</dd></div>
          </dl>
        </article>
      </section>

      <section class="distillation">
        <div>
          <span>PROTOCOL</span>
          <h3>PERSONALITY DISTILLATION</h3>
          <p>思想、记忆、习惯与选择模式的持续归档接口。</p>
        </div>
        <button type="button" @click="beginDistillation">BEGIN DISTILLATION</button>
      </section>

      <p v-if="message" class="not-yet">{{ message }}</p>

      <footer>
        <span>THIS RECORD IS INCOMPLETE.</span>
        <span>DO NOT ASSUME FINALITY.</span>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.identity-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  color: #e1e7e3;
  background:
    radial-gradient(circle at 50% 0, rgba(255,255,255,.05), transparent 30rem),
    linear-gradient(180deg, #080b0a, #030504);
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}
.identity-page::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,.012) 3px 4px);
}
.identity-noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: .035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 140 140' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='x'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23x)'/%3E%3C/svg%3E");
}
.identity-shell { width: min(1040px, calc(100% - 36px)); margin: 0 auto; padding: 42px 0 28px; }
.back { border: 0; padding: 0; background: none; color: #657168; font: inherit; font-size: 11px; letter-spacing: .12em; cursor: pointer; }
.back:hover { color: #e4ece7; }
.warning { width: fit-content; margin-top: 72px; padding: 7px 10px; border: 1px solid #59483a; color: #b59677; font-size: 10px; letter-spacing: .16em; }
.sequence { margin: 18px 0 8px; color: #505b54; font-size: 10px; letter-spacing: .16em; }
h1 { margin: 0; font-size: clamp(46px, 10vw, 112px); font-weight: 500; line-height: .95; letter-spacing: -.04em; }
blockquote { max-width: 790px; margin: 44px 0 58px; padding: 0; border: 0; color: #8e9992; font-family: system-ui, sans-serif; font-size: clamp(18px, 2.4vw, 27px); font-weight: 300; line-height: 1.75; }
.instance-grid { display: grid; grid-template-columns: 1fr 120px 1fr; gap: 16px; align-items: center; }
.instance { min-height: 300px; border: 1px solid #263129; background: rgba(255,255,255,.018); }
.instance-head { display: flex; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #242d27; color: #566159; font-size: 9px; letter-spacing: .14em; }
.instance-head i { width: 7px; height: 7px; border-radius: 50%; background: #88ffac; box-shadow: 0 0 12px rgba(136,255,172,.5); }
.dormant .instance-head i { background: #404942; box-shadow: none; }
.instance h2 { margin: 42px 20px 5px; font-size: clamp(25px, 4vw, 38px); font-weight: 500; }
.instance > p { margin: 0 20px 38px; color: #58635b; font-size: 10px; letter-spacing: .1em; }
dl { margin: 0; border-top: 1px solid #242d27; }
dl div { display: flex; justify-content: space-between; gap: 20px; padding: 11px 16px; border-bottom: 1px solid rgba(36,45,39,.65); font-size: 10px; }
dt { color: #515c54; } dd { margin: 0; color: #9aa69e; }.active dl div:first-child dd { color: #88ffac; }
.transfer { display: flex; flex-direction: column; align-items: center; color: #323a35; }
.transfer span { width: 100%; overflow: hidden; white-space: nowrap; }
.transfer b { margin: 7px 0; color: #606b63; font-size: 20px; font-weight: 400; }
.transfer small { color: #424b45; font-size: 8px; letter-spacing: .08em; text-align: center; }
.distillation { display: flex; justify-content: space-between; gap: 28px; align-items: end; margin-top: 52px; padding-top: 28px; border-top: 1px solid #202823; }
.distillation span { color: #4c5750; font-size: 9px; letter-spacing: .13em; }
.distillation h3 { margin: 8px 0; font-size: 18px; font-weight: 500; }
.distillation p { margin: 0; color: #6a756e; font-family: system-ui, sans-serif; font-size: 13px; }
.distillation button { min-width: 220px; padding: 15px 20px; border: 1px solid #58675d; background: rgba(255,255,255,.018); color: #bac6be; font: inherit; font-size: 10px; letter-spacing: .1em; cursor: pointer; transition: .2s ease; }
.distillation button:hover { border-color: #88ffac; color: #88ffac; box-shadow: inset 0 0 24px rgba(136,255,172,.035); }
.not-yet { margin: 20px 0 0; color: #88ffac; font-size: 11px; letter-spacing: .2em; animation: appear .2s steps(2,end); }
footer { display: flex; justify-content: space-between; margin-top: 80px; padding-top: 16px; border-top: 1px solid #171e1a; color: #343c37; font-size: 8px; letter-spacing: .13em; }
@keyframes appear { from { opacity: 0; transform: translateX(-3px); } to { opacity: 1; transform: none; } }
@media (max-width: 760px) {
  .identity-shell { width: calc(100% - 24px); padding-top: 26px; }
  .warning { margin-top: 52px; }
  .instance-grid { grid-template-columns: 1fr; }
  .transfer { min-height: 72px; justify-content: center; transform: rotate(90deg); }
  .transfer small { display: none; }
  .distillation { align-items: stretch; flex-direction: column; }
  .distillation button { width: 100%; }
  footer { flex-direction: column; gap: 10px; }
}
</style>
