<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteFooter from '../components/SiteFooter.vue'
import SiteNav from '../components/SiteNav.vue'
import { archiveCopy, releases } from '../data/siteRecords'
import { legalCopy, legalDocuments, legalPaths } from '../data/legal'

const { locale } = useI18n()
const lang = computed(() => archiveCopy[locale.value] ? locale.value : 'zh')
const copy = computed(() => archiveCopy[lang.value])

const uiFollowup = {
  zh: [
    '同版本后续调整：首页项目区改为使用 001 / 002 / 003 的真实项目图片，点击可直接进入对应项目详情。',
    '语言切换收纳为下拉选择；统一首页与内页导航，并为手机端加入可展开菜单，确保项目、电台、会员、反馈和个人账户入口可访问。',
    '全站主要卡片、导航、终端与表单面板加入半透明背景、背景模糊、轻边框与阴影，增强磨砂玻璃质感，同时保留原有赛博工业风。',
  ],
  en: [
    'Same-version follow-up: the home project area now uses the real artwork for Projects 001 / 002 / 003 and opens each project directly.',
    'Language switching is now a compact dropdown. Home and inner-page navigation are unified, with an expandable mobile menu that keeps project, radio, membership, feedback and account links accessible.',
    'Primary cards, navigation, terminal and form panels now use translucent surfaces, background blur, soft borders and shadows for a glassmorphism treatment while retaining the cyber-industrial visual language.',
  ],
  ja: [
    '同一バージョンの追加調整として、ホームのプロジェクト欄に001 / 002 / 003の実際の画像を使用し、各プロジェクトへ直接移動できるようにしました。',
    '言語切替をコンパクトなプルダウンに変更し、ホームと各ページのナビゲーションを共通化。モバイルでは展開メニューからプロジェクト、無線、会員、フィードバック、アカウントへアクセスできます。',
    '主要カード、ナビゲーション、ターミナル、フォームに半透明背景、背景ぼかし、細い境界線と影を加え、サイバー／インダストリアル感を残したガラス表現に更新しました。',
  ],
}

const displayReleases = computed(() => releases.map((release, index) => {
  if (index !== 0) return release
  const currentLang = lang.value
  return {
    ...release,
    [currentLang]: {
      ...release[currentLang],
      items: [...release[currentLang].items, ...uiFollowup[currentLang]],
    },
  }
}))
</script>

<template>
  <div class="archive-page"><div class="container"><SiteNav />
    <main class="archive-main" :lang="lang === 'zh' ? 'zh-CN' : lang">
      <header class="archive-heading">
        <p class="eyebrow">// YUASHIE · SITE ARCHIVE</p>
        <div class="archive-title-row"><h1>{{ copy.title }}</h1><span class="archive-version">V0.3.2</span></div>
        <p class="archive-intro">{{ copy.intro }}</p>
      </header>
      <nav class="legal-entry-grid" :aria-label="legalCopy[lang].navigation">
        <RouterLink v-for="(path, key) in legalPaths" :key="key" :to="path" class="legal-entry">
          <span class="legal-entry-code">{{ key.toUpperCase() }} / ↗</span>
          <strong>{{ legalDocuments[lang][key].title }}</strong><span>{{ legalDocuments[lang][key].summary }}</span>
        </RouterLink>
      </nav>
      <section class="release-section" aria-labelledby="release-title">
        <div class="release-section-heading"><h2 id="release-title">{{ copy.log }}</h2><span>{{ copy.order }}</span></div>
        <p class="release-note">{{ copy.note }}</p>
        <ol class="release-list">
          <li v-for="(release, index) in displayReleases" :key="release.version" class="release-item" :class="{ 'release-current': index === 0 }">
            <div class="release-meta"><strong>V{{ release.version }}</strong><time :datetime="release.date">{{ release.date.replaceAll('-', '.') }}</time><span v-if="index === 0" class="release-badge">{{ copy.latest }}</span></div>
            <article class="release-body"><h3>{{ release[lang].title }}</h3><ul><li v-for="item in release[lang].items" :key="item">{{ item }}</li></ul></article>
          </li>
        </ol>
        <aside class="archive-origin"><span>2026.08.24 — 2026.08.28</span><h3>{{ copy.originTitle }}</h3><p>{{ copy.origin }}</p></aside>
      </section>
    </main>
  </div><SiteFooter /></div>
</template>
