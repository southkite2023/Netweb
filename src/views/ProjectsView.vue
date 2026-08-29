<script setup>
import { useI18n } from 'vue-i18n'
import SiteFooter from '../components/SiteFooter.vue'
import SiteNav from '../components/SiteNav.vue'
import { localizedField, projects } from '../data/projects'

const { t, locale } = useI18n()
</script>

<template>
  <div class="projects-page">
    <div class="container">
      <SiteNav />

      <main class="projects-main">
        <header class="projects-header">
          <div>
            <p class="eyebrow">// PROJECT ARCHIVE</p>
            <h1>{{ t('projectArchive.title') }}</h1>
          </div>
          <p>{{ t('projectArchive.intro') }}</p>
        </header>

        <div class="projects-grid" aria-label="Project list">
          <RouterLink v-for="project in projects" :key="project.id" class="project-tile" :to="`/projects/${project.id}`">
            <div class="project-image-wrap">
              <img class="project-image" :src="project.image" :alt="localizedField(project, 'title', locale)">
              <span class="project-number">{{ project.id }}</span>
            </div>

            <div class="project-copy">
              <div>
                <h2>{{ localizedField(project, 'title', locale) }}</h2>
                <p>{{ localizedField(project, 'summary', locale) }}</p>
              </div>
              <span class="project-arrow" aria-hidden="true">↗</span>
            </div>
          </RouterLink>
        </div>
      </main>
    </div>

    <SiteFooter />
  </div>
</template>
