<script setup>
import { computed } from 'vue'
import projectArtwork from '../assets/projects/project-004.svg'
import { useI18n } from 'vue-i18n'
import { calendarCopy } from '../data/calendar'
import '../quota-hub.css'
import '../calendar.css'
const { locale } = useI18n()
const selectionCopy = {
  zh: { open: '进入日程选择', intro: '选择关注的游戏与当季动漫，生成固定订阅链接，让日历获取后续排期。', warning: '通过固定网址订阅日历。动漫连接定时更新源；游戏随公告数据维护更新。刷新频率由日历客户端决定。' },
  en: { open: 'Choose schedules', intro: 'Choose games and seasonal anime, then export updates, previews, banners and airings to your calendar.', warning: 'Export an ICS file from the schedule picker. Check verification status and freshness there; dynamic subscriptions are available below.' },
  ja: { open: 'スケジュールを選択', intro: 'ゲームと今期アニメを選び、更新・予告配信・ガチャ・放送予定をカレンダーへ書き出せます。', warning: '選択画面からICSをダウンロードできます。確認状況と更新日は機能ページをご覧ください。継続購読は下の入口から管理できます。' },
}
const c = computed(() => ({ ...(calendarCopy[locale.value] || calendarCopy.zh), ...(selectionCopy[locale.value] || selectionCopy.zh) }))
</script>

<template>
  <section class="quota-page quota-project calendar-page">
    <div class="quota-kicker"><span>PROJECT / 004</span><span>{{ c.badge }}</span></div>
    <div class="quota-project-grid">
      <header>
        <p class="quota-wordmark"><span class="quota-symbol" aria-hidden="true">C</span> ACG Calendar</p>
        <h1>{{ c.headline[0] }}<br><span>{{ c.headline[1] }}</span></h1>
        <p class="quota-intro">{{ c.intro }}</p>
        <RouterLink class="quota-primary" to="/projects/004/select">{{ c.open }} <span aria-hidden="true">↗</span></RouterLink>
      </header>
      <figure class="project-vector-hero">
        <img :src="projectArtwork" width="1280" height="800" alt="ACG Calendar" decoding="async">
        <figcaption><span v-for="label in c.categories" :key="label">{{ label }}</span></figcaption>
      </figure>
    </div>
    <div class="quota-features"><article v-for="(feature, index) in c.features" :key="feature[0]"><span>0{{ index + 1 }}</span><h2>{{ feature[0] }}</h2><p>{{ feature[1] }}</p></article></div>

  </section>
</template>

<style scoped>
.project-vector-hero { margin:0;min-width:0;align-self:center; }
.project-vector-hero img { display:block;width:100%;height:auto;border:1px solid var(--line);border-radius:18px; }
.project-vector-hero figcaption { display:flex;flex-wrap:wrap;gap:8px;margin-top:14px; }
.project-vector-hero figcaption span { font-size:11px;color:var(--muted);padding:5px 9px;border:1px solid var(--line);border-radius:6px; }
</style>
