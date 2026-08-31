<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { changeLanguage } from '../i18n'
import beianIcon from '../assets/beian-icon.png'

const { t, locale } = useI18n()

const isLightMode = ref(localStorage.getItem('theme') === 'light')
let observer

function applyTheme() {
  document.documentElement.dataset.theme = isLightMode.value ? 'light' : 'dark'
}

function toggleTheme() {
  isLightMode.value = !isLightMode.value
  localStorage.setItem('theme', isLightMode.value ? 'light' : 'dark')
  applyTheme()
}

applyTheme()

onMounted(() => {
  observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.12 }
  )

  document.querySelectorAll('.reveal').forEach(el => {
    observer.observe(el)
  })
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div class="home-page">

    <div class="container">
      <nav>
        <div class="brand-cluster">
          <RouterLink to="/" class="brand">
            <span class="brand-mark"></span>
            <span>YUASHIE</span>
          </RouterLink>

          <button
            class="theme-toggle"
            type="button"
            :aria-label="isLightMode ? 'Switch to dark mode' : 'Switch to light mode'"
            :title="isLightMode ? 'Dark mode' : 'Light mode'"
            :aria-pressed="isLightMode"
            @click="toggleTheme"
          >
            <span aria-hidden="true">{{ isLightMode ? '🌙' : '☀️' }}</span>
          </button>
        </div>

        <div class="nav-right">
          <RouterLink class="nav-link" to="/projects">
            {{ t('nav.projects') }}
          </RouterLink>

          <RouterLink class="nav-link" to="/about">
            {{ t('nav.about') }}
          </RouterLink>

          <RouterLink class="nav-link" to="/vip">
            {{ t('nav.vip') }}
          </RouterLink>

          <RouterLink class="nav-link" to="/login">
            {{ t('nav.login') }}
          </RouterLink>

          <div class="language-switcher">
            <button
              :class="{ active: locale === 'zh' }"
              @click="changeLanguage('zh')"
            >
              简体中文
            </button>

            <span>/</span>

            <button
              :class="{ active: locale === 'en' }"
              @click="changeLanguage('en')"
            >
              English
            </button>

            <span>/</span>

            <button
              :class="{ active: locale === 'ja' }"
              @click="changeLanguage('ja')"
            >
              日本語
            </button>
          </div>

          <div class="status">
            <span class="status-dot"></span>
            {{ t('terminal.online') }}
          </div>
        </div>
      </nav>

      <main class="hero">
        <div>
          <div class="eyebrow reveal">
            {{ t('hero.eyebrow') }}
          </div>

          <h1 class="reveal">
            {{ t('hero.line1') }}<br>
            {{ t('hero.line2') }}<br>
            <span>{{ t('hero.line3') }}</span>
          </h1>

          <p class="intro reveal">
            {{ t('hero.intro') }}
          </p>

          <div class="hero-actions reveal">
            <RouterLink class="btn btn-primary" to="/projects">
              {{ t('hero.projects') }}
              <span>→</span>
            </RouterLink>

            <RouterLink class="btn btn-secondary" to="/about">
              {{ t('hero.about') }}
            </RouterLink>
          </div>
        </div>

        <div class="terminal reveal">
          <div class="terminal-top">
            <div class="dots">
              <i></i>
              <i></i>
              <i></i>
            </div>

            <span class="terminal-title">
              yuashie@node
            </span>
          </div>

          <div class="terminal-body">
            <div>
              <span class="prompt">$</span>
              systemctl status yuashie
            </div>

            <div class="terminal-green">
              ● yuashie.service - Personal Node
            </div>

            <br>

            <div>
              {{ t('terminal.status') }}&nbsp;&nbsp;&nbsp;&nbsp;
              <span class="terminal-white">
                {{ t('terminal.online') }}
              </span>
            </div>

            <div>
              {{ t('terminal.protocol') }}&nbsp;&nbsp;
              <span class="terminal-white">HTTPS</span>
            </div>

            <div>
              {{ t('terminal.region') }}&nbsp;&nbsp;&nbsp;&nbsp;
              <span class="terminal-white">CN</span>
            </div>

            <div>
              {{ t('terminal.version') }}&nbsp;&nbsp;&nbsp;
              <span class="terminal-white">0.3.1</span>
            </div>

            <br>

            <div>
              <span class="prompt">$</span>
              cat ./about.txt
            </div>

            <div class="terminal-white terminal-about">
              <p>{{ t('terminal.about.greeting') }}</p>
              <p>{{ t('terminal.about.curious') }}</p>
              <p>{{ t('terminal.about.description') }}</p>
              <p>{{ t('terminal.about.welcome') }}</p>
              <p>{{ t('terminal.about.developing') }}</p>
            </div>

            <br>

            <div>
              <span class="prompt">$</span>
              <span class="cursor"></span>
            </div>
          </div>
        </div>
      </main>
    </div>

    <section>
      <div class="container">
        <div class="section-label reveal">
          01 / {{ t('projects.title') }}
        </div>

        <div class="grid">
          <RouterLink class="card reveal" to="/projects">
            <span class="card-index">001</span>

            <div>
              <h3>{{ t('projects.aiTitle') }}</h3>
              <p>{{ t('projects.aiText') }}</p>
            </div>

            <span class="arrow">→</span>
          </RouterLink>

          <RouterLink class="card reveal" to="/projects">
            <span class="card-index">002</span>

            <div>
              <h3>{{ t('projects.softwareTitle') }}</h3>
              <p>{{ t('projects.softwareText') }}</p>
            </div>

            <span class="arrow">→</span>
          </RouterLink>

          <RouterLink class="card reveal" to="/projects">
            <span class="card-index">003</span>

            <div>
              <h3>{{ t('projects.archiveTitle') }}</h3>
              <p>{{ t('projects.archiveText') }}</p>
            </div>

            <span class="arrow">→</span>
          </RouterLink>
        </div>
      </div>
    </section>

    <section>
      <div class="container">
        <div class="section-label reveal">
          02 / {{ t('manifesto.title') }}
        </div>

        <div class="quote">
          <h2 class="reveal">
            {{ t('manifesto.quote') }}
          </h2>

          <div class="quote-side reveal">
            <p>{{ t('manifesto.p1') }}</p>

            <br>

            <p>{{ t('manifesto.p2') }}</p>
          </div>
        </div>
      </div>
    </section>

    <footer>
      <div class="container footer-content">
        <div class="footer-main">
          <span>
            Copyright © 2026-至今 北住孤居
          </span>

          <span>
            {{ t('footer.status') }}
          </span>
        </div>

        <div class="filing-links">
          <a
            class="filing-link"
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
          >
            蜀ICP备2026050398号-1
          </a>

          <a
            class="filing-link public-security-link"
            href="https://beian.mps.gov.cn/#/query/webSearch?code=51050202000608"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              class="beian-icon"
              :src="beianIcon"
              alt=""
              aria-hidden="true"
            >
            <span>川公网安备51050202000608号</span>
          </a>
        </div>
      </div>
    </footer>

  </div>
</template>
