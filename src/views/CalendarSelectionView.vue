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
import SiteFooter from '../components/SiteFooter.vue'
</script>

<template>
  <div class="calendar-selection-page">
    <div class="container">
      <SiteNav />
      <main class="calendar-selection-main">
        <RouterLink class="detail-back" to="/projects/004">← 返回日历项目介绍</RouterLink>
        <iframe ref="frame" class="calendar-selection-frame" src="/assets/calendar/index.html" title="日程选择：游戏与动漫"></iframe>
        <RouterLink to="/projects/004/subscribe">管理动态日历订阅 →</RouterLink>
      </main>
    </div>
    <SiteFooter />
  </div>
</template>

<style scoped>
.calendar-selection-main { padding:40px 0 64px; }
.calendar-selection-frame { display:block; width:100%; height:1120px; border:0; border-radius:16px; margin:24px 0; background:var(--bg); }
@media(max-width:700px){.calendar-selection-frame{height:1560px;}}
</style>
