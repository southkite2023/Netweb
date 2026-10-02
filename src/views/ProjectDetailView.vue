<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import SiteFooter from '../components/SiteFooter.vue'
import SiteNav from '../components/SiteNav.vue'
import CommentSection from '../components/CommentSection.vue'
import MinecraftWhitelistPanel from '../components/MinecraftWhitelistPanel.vue'
import RadioProjectPanel from '../components/RadioProjectPanel.vue'
import QuotaProjectIntro from '../components/QuotaProjectIntro.vue'
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
        <RouterLink class="detail-back" to="/project">← {{ t('projectArchive.back') }}</RouterLink>

        <QuotaProjectIntro v-if="project.id === '001'" />

        <header v-if="project.id !== '001'" class="detail-header">
          <div class="detail-kicker">
            <span>PROJECT / {{ project.id }}</span>
            <span>{{ localizedField(project, 'status', locale) }}</span>
          </div>
          <h1>{{ localizedField(project, 'title', locale) }}</h1>
          <p>{{ localizedField(project, 'summary', locale) }}</p>
        </header>

        <figure v-if="project.id !== '001'" class="detail-visual">
          <img :src="project.image" :alt="localizedField(project, 'title', locale)">
        </figure>

        <section v-if="project.id !== '001'" class="detail-content">
          <div class="detail-meta">
            <div><span>{{ t('projectArchive.type') }}</span><strong>{{ localizedField(project, 'type', locale) }}</strong></div>
            <div><span>{{ t('projectArchive.status') }}</span><strong>{{ localizedField(project, 'status', locale) }}</strong></div>
            <div v-if="project.version"><span>{{ t('projectArchive.version') }}</span><strong>{{ project.version }}</strong></div>
            <div><span>{{ t('projectArchive.year') }}</span><strong>{{ project.year }}</strong></div>
          </div>
          <div class="detail-description">
            <p class="section-label">01 / {{ t('projectArchive.overview') }}</p>
            <p>{{ localizedField(project, 'description', locale) }}</p>
            <p class="detail-note">{{ project.note ? localizedField(project, 'note', locale) : t('projectArchive.moreSoon') }}</p>
            <div v-if="project.repository || project.downloadUrl" class="project-actions">
              <a v-if="project.repository" class="btn btn-primary" :href="project.repository" target="_blank" rel="noopener noreferrer">{{ localizedField(project, 'repositoryLabel', locale) }} ↗</a>
              <a v-if="project.downloadUrl" class="btn btn-secondary" :href="project.downloadUrl">{{ localizedField(project, 'downloadLabel', locale) }} ↓</a>
            </div>
            <p v-if="project.downloadNote" class="detail-note">{{ localizedField(project, 'downloadNote', locale) }}</p>
          </div>
        </section>

        <MinecraftWhitelistPanel v-if="project.id === '002'" />
        <RadioProjectPanel v-if="project.id === '003'" />

        <CommentSection :key="project.id" :project-id="project.id" />

        <nav class="project-pagination" aria-label="Project navigation">
          <RouterLink to="/project">{{ t('projectArchive.allProjects') }}</RouterLink>
          <RouterLink v-if="nextProject" :to="`/projects/${nextProject.id}`">{{ t('projectArchive.next') }} →</RouterLink>
        </nav>
      </main>

      <main v-else class="project-not-found">
        <p class="eyebrow">// 404</p>
        <h1>{{ t('projectArchive.notFound') }}</h1>
        <RouterLink class="btn btn-primary" to="/project">{{ t('projectArchive.allProjects') }}</RouterLink>
      </main>
    </div>

    <SiteFooter />
  </div>
</template>

<style scoped>
.project-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
</style>
