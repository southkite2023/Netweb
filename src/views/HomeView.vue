<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteFooter from '../components/SiteFooter.vue'
import SiteNav from '../components/SiteNav.vue'
import { projects } from '../data/projects'
import { experienceCopy } from '../data/experience'
import { latestRelease } from '../data/latestRelease'
import { SITE_VERSION } from '../data/version'
import { openCommands } from '../lib/navigation'
import { isLightMode } from '../lib/theme'
import dayBanner from '../assets/hero-day-observatory.jpg'
import heroBanner from '../assets/hero-starry-observatory.jpg'

const { t, locale } = useI18n()
const c = computed(() => experienceCopy[locale.value] || experienceCopy.zh)
const latest = computed(() => latestRelease[locale.value] || latestRelease.zh)
</script>

<template>
  <div class="home-page">
    <div class="container">
      <SiteNav />

      <main id="main-content" tabindex="-1" class="home-content">
      <div class="home-announcement"><span class="announcement-mark" aria-hidden="true">↗</span><RouterLink to="/about">{{ c.latest }} · {{ latest.title }}</RouterLink><span class="announcement-version">v{{ SITE_VERSION }}</span></div>
      <div class="hero home-hero">
        <div class="hero-feature">
          <div class="hero-signal-art" aria-hidden="true"><img :src="isLightMode ? dayBanner : heroBanner" alt="" width="2400" height="1024" decoding="async" fetchpriority="high"><span class="signal-coordinate">YU / 001</span></div>
          <div class="eyebrow">
            {{ t('hero.eyebrow') }}
          </div>

          <h1>
            {{ t('hero.line1') }}
            {{ t('hero.line2') }}<br>
            <span>{{ t('hero.line3') }}</span>
          </h1>

          <p class="intro">
            {{ t('hero.intro') }}
          </p>

          <div class="hero-actions">
            <RouterLink class="btn btn-primary" to="/project">
              {{ t('hero.projects') }}
              <span>→</span>
            </RouterLink>

          </div>
          <div class="hero-caption"><span>YUASHIE / PERSONAL SPACE</span><span aria-hidden="true">01 — ∞</span></div>
        </div>

        <aside class="terminal node-panel">
          <div class="terminal-top"><div class="dots" aria-hidden="true"><i></i><i></i><i></i></div><span class="terminal-title">yuashie / personal-node</span></div>
          <div class="node-body">
            <p class="node-command"><span aria-hidden="true">◈</span> YUASHIE</p>
            <h2>{{ c.nodeTitle }}</h2><p class="node-description">{{ c.nodeText }}</p>
            <dl class="node-facts"><div><dt>{{ c.version }}</dt><dd>v{{ SITE_VERSION }}</dd></div><div><dt>{{ c.projects }}</dt><dd>{{ String(projects.length).padStart(2, '0') }}</dd></div><div><dt>{{ c.languages }}</dt><dd>ZH / EN / JA</dd></div></dl>
            <button class="node-search" type="button" @click="openCommands"><span>{{ c.search }}</span><kbd>⌘ / Ctrl K</kbd></button>
          </div>
        </aside>
      </div>

    <section class="home-manifesto" aria-labelledby="home-quote">
      <div>
        <div class="quote">
          <h2 id="home-quote">
            {{ t('manifesto.quote') }}
          </h2>

          <div class="quote-side">
            <p>{{ t('manifesto.p1') }}</p>

            <br>

            <p>{{ t('manifesto.p2') }}</p>
          </div>
        </div>
      </div>
    </section>
      </main>
    </div>
    <SiteFooter>
      <p class="home-thanks"><span>{{ t('footer.specialThanks') }}</span><a href="https://openai.com/" target="_blank" rel="noopener noreferrer">ChatGPT</a></p>
    </SiteFooter>
  </div>
</template>

<style scoped>
.home-thanks {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 0 .4em;
  margin: 0;
  min-height: 24px;
  line-height: 1.8;
}
.home-thanks a {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  color: var(--accent);
  text-decoration: none;
}
.home-thanks a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}
</style>
