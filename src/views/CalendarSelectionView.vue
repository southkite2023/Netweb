<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { setTheme } from '../lib/theme'
const frame = ref(null)
function receiveTheme(event) {
  if(event.origin !== location.origin || event.source !== frame.value?.contentWindow || event.data?.type !== 'calendar-theme') return
  if(['light','dark'].includes(event.data.theme)) setTheme(event.data.theme)
}
onMounted(()=>window.addEventListener('message',receiveTheme))
onBeforeUnmount(()=>window.removeEventListener('message',receiveTheme))
import SiteNav from '../components/SiteNav.vue'

</script>

<template>
  <div class="calendar-selection-page">
    <div class="container">
      <SiteNav />
      <main class="calendar-selection-main">
        <div class="picker-links"><RouterLink class="detail-back" to="/projects/004">← 返回日历项目介绍</RouterLink>
        <RouterLink to="/projects/004/subscribe">管理动态日历订阅 →</RouterLink></div>
        <iframe ref="frame" class="calendar-selection-frame" src="/assets/calendar/index.html" title="日程选择：游戏与动漫"></iframe>
      </main>
    </div>

  </div>
</template>

<style scoped>
.calendar-selection-page{height:100vh;height:100dvh}
.calendar-selection-page>.container{height:100%;display:flex;flex-direction:column}
.calendar-selection-main{flex:1;min-height:0;display:flex;flex-direction:column;padding:0 0 6px}
.picker-links{display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:12px}
.picker-links a{margin:0}
.calendar-selection-frame{display:block;width:100%;flex:1;min-height:0;border:0;border-radius:12px;background:var(--bg)}
</style>