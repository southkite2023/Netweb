<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import SiteFooter from '../components/SiteFooter.vue'
import SiteNav from '../components/SiteNav.vue'
import CommentSection from '../components/CommentSection.vue'
import { localizedField, projects } from '../data/projects'

const route = useRoute()
const { t, locale } = useI18n()
const project = computed(() => projects.find(item => item.id === route.params.id))
const nextProject = computed(() => projects[projects.findIndex(item => item.id === project.value?.id) + 1])
</script>

<template>
  <div class="project-detail-page">
    <div class="container">
      <SiteNav />

      <main v-if="project" class="project-detail-main">
        <RouterLink class="detail-back" to="/projects">← {{ t('projectArchive.back') }}</RouterLink>

        <header class="detail-header">
          <div class="detail-kicker">
            <span>PROJECT / {{ project.id }}</span>
            <span>{{ localizedField(project, 'status', locale) }}</span>
          </div>
          <h1>{{ localizedField(project, 'title', locale) }}</h1>
          <p>{{ localizedField(project, 'summary', locale) }}</p>
        </header>

        <figure class="detail-visual">
          <img :src="project.image" :alt="localizedField(project, 'title', locale)">
        </figure>

        <section class="detail-content">
          <div class="detail-meta">
            <div><span>{{ t('projectArchive.type') }}</span><strong>{{ localizedField(project, 'type', locale) }}</strong></div>
            <div><span>{{ t('projectArchive.status') }}</span><strong>{{ localizedField(project, 'status', locale) }}</strong></div>
            <div v-if="project.version"><span>{{ t('projectArchive.version') }}</span><strong>{{ project.version }}</strong></div>
            <div><span>{{ t('projectArchive.year') }}</span><strong>{{ project.year }}</strong></div>
          </div>
          <div class="detail-description">
            <p class="section-label">01 / {{ t('projectArchive.overview') }}</p>
            <p>{{ localizedField(project, 'description', locale) }}</p>
            <p class="detail-note">{{ t('projectArchive.moreSoon') }}</p>
          </div>
        </section>

        <CommentSection :project-id="project.id" />

        <nav class="project-pagination" aria-label="Project navigation">
          <RouterLink to="/projects">{{ t('projectArchive.allProjects') }}</RouterLink>
          <RouterLink v-if="nextProject" :to="`/projects/${nextProject.id}`">{{ t('projectArchive.next') }} →</RouterLink>
        </nav>
      </main>

      <main v-else class="project-not-found">
        <p class="eyebrow">// 404</p>
        <h1>{{ t('projectArchive.notFound') }}</h1>
        <RouterLink class="btn btn-primary" to="/projects">{{ t('projectArchive.allProjects') }}</RouterLink>
      </main>
    </div>

    <SiteFooter />
  </div>
</template>
