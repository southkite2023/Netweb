<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteFooter from '../components/SiteFooter.vue'
import SiteNav from '../components/SiteNav.vue'
import { localizedField, projects } from '../data/projects'
import { experienceCopy } from '../data/experience'
import { latestRelease } from '../data/latestRelease'
import { SITE_VERSION } from '../data/version'
import { openCommands } from '../lib/navigation'
import { playroomCopy } from '../data/playroom'

const { t, locale } = useI18n()
const featuredProjects = projects.slice(0, 3)
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
          <div class="hero-signal-art" aria-hidden="true"><div class="signal-orbit orbit-one"></div><div class="signal-orbit orbit-two"></div><div class="signal-orbit orbit-three"></div><span class="signal-coordinate">YU / 001</span><span class="signal-axis">+<br>+<br>+</span></div>
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
            <RouterLink class="btn btn-primary" to="/projects">
              {{ t('hero.projects') }}
              <span>→</span>
            </RouterLink>

            <RouterLink class="btn btn-secondary" to="/explore">
              {{ c.explore }}
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
            <RouterLink class="home-play-link" to="/play"><span aria-hidden="true">✦</span><span>{{ (playroomCopy[locale] || playroomCopy.zh).playHint }}</span><span>↗</span></RouterLink>
          </div>
        </aside>
      </div>

    <section class="home-selected">
      <div>
        <div class="section-heading"><div><p class="section-label">01 / SELECTED PROJECTS</p><h2>{{ c.featured }}</h2><p>{{ c.featuredIntro }}</p></div><RouterLink to="/explore">{{ c.explore }} ↗</RouterLink></div>

        <div class="home-project-grid">
          <RouterLink
            v-for="project in featuredProjects"
            :key="project.id"
            class="home-project-card"
            :to="`/projects/${project.id}`"
          >
            <img
              class="home-project-image"
              loading="lazy" decoding="async" width="640" height="480"
              :src="project.image"
              :alt="localizedField(project, 'title', locale)"
            >

            <div class="home-project-copy">
              <span class="home-project-meta"><span>PROJECT / {{ project.id }}</span><span>{{ localizedField(project, 'status', locale) }}</span></span>
              <h3>{{ localizedField(project, 'title', locale) }}</h3>
              <p>{{ localizedField(project, 'summary', locale) }}</p>
            </div>

            <span class="home-project-arrow" aria-hidden="true">↗</span>
          </RouterLink>
        </div>
      </div>
    </section>

    <section class="home-discovery"><div class="discovery-duo"><RouterLink class="lab-invitation" to="/lab"><span class="section-label">02 / SIGNAL LAB</span><span class="lab-glyph" aria-hidden="true">−·−·  −−·−</span><h2>{{ c.enterLab }}</h2><p>{{ c.labIntro }}</p><span class="inline-link">{{ c.lab }} ↗</span></RouterLink><RouterLink class="release-invitation" to="/about"><span class="section-label">{{ c.latest }}</span><span class="release-number">v{{ SITE_VERSION }}</span><h2>{{ latest.title }}</h2><time :datetime="latestRelease.date">{{ latestRelease.date }}</time><span class="inline-link">{{ c.release }} ↗</span></RouterLink></div></section>

    <section class="home-manifesto">
      <div>
        <div class="section-label">
          03 / {{ t('manifesto.title') }}
        </div>

        <div class="quote">
          <h2>
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
    <SiteFooter />
  </div>
</template>

<style scoped>
.home-play-link{display:flex;align-items:center;gap:10px;margin-top:18px;padding-top:18px;border-top:1px solid var(--line);font-size:.875rem;line-height:1.6;color:var(--intro-text)}.home-play-link>span:first-child,.home-play-link>span:last-child{color:var(--accent)}.home-play-link>span:nth-child(2){flex:1}.home-play-link:hover{color:var(--accent)}
</style>
