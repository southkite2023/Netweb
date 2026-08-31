<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteFooter from '../components/SiteFooter.vue'
import SiteNav from '../components/SiteNav.vue'
import { localizedField, projects } from '../data/projects'

const { t, locale } = useI18n()
const featuredProjects = projects.slice(0, 3)
let observer

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
      <SiteNav />

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
              <span class="terminal-white">0.3.2</span>
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

        <div class="home-project-grid">
          <RouterLink
            v-for="project in featuredProjects"
            :key="project.id"
            class="home-project-card reveal"
            :to="`/projects/${project.id}`"
          >
            <img
              class="home-project-image"
              :src="project.image"
              :alt="localizedField(project, 'title', locale)"
            >

            <div class="home-project-shade" aria-hidden="true"></div>

            <div class="home-project-copy">
              <span>PROJECT / {{ project.id }}</span>
              <h3>{{ localizedField(project, 'title', locale) }}</h3>
              <p>{{ localizedField(project, 'summary', locale) }}</p>
            </div>

            <span class="home-project-arrow" aria-hidden="true">↗</span>
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

    <SiteFooter />
  </div>
</template>
