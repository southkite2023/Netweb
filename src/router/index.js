import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '../views/HomeView.vue'
import ProjectsView from '../views/ProjectsView.vue'
import ProjectDetailView from '../views/ProjectDetailView.vue'
import Archive000View from '../views/Archive000View.vue'
import IdentityBackupView from '../views/IdentityBackupView.vue'
import AboutView from '../views/AboutView.vue'
import LegalView from '../views/LegalView.vue'
import VipView from '../views/VipView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ProfileView from '../views/ProfileView.vue'
import FeedbackView from '../views/FeedbackView.vue'
import AdminFeedbackView from '../views/AdminFeedbackView.vue'
import RadioHomeView from '../views/RadioHomeView.vue'
import RadioLogView from '../views/RadioLogView.vue'
import RadioLogFormView from '../views/RadioLogFormView.vue'
import RadioQslView from '../views/RadioQslView.vue'
import RadioStationEditView from '../views/RadioStationEditView.vue'
import RadioStationView from '../views/RadioStationView.vue'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior() {
    // New pages always start at the top, even with global smooth scrolling.
    return { top: 0, left: 0, behavior: 'instant' }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/home',
      redirect: '/',
    },
    {
      path: '/projects',
      name: 'projects',
      component: ProjectsView,
    },
    {
      path: '/projects/000',
      name: 'archive-000',
      component: Archive000View,
    },
    {
      path: '/projects/000/identity',
      name: 'identity-backup',
      component: IdentityBackupView,
    },
    {
      path: '/projects/:id',
      name: 'project-detail',
      component: ProjectDetailView,
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
    },
    { path: '/terms', name: 'terms', component: LegalView, props: { documentId: 'terms' } },
    { path: '/privacy', name: 'privacy', component: LegalView, props: { documentId: 'privacy' } },
    { path: '/works', name: 'works', component: LegalView, props: { documentId: 'works' } },
    {
      path: '/vip',
      name: 'vip',
      component: VipView,
    },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/u/:username', name: 'profile', component: ProfileView },
    { path: '/feedback', name: 'feedback', component: FeedbackView },
    { path: '/admin/feedback', name: 'admin-feedback', component: AdminFeedbackView },
    { path: '/radio', name: 'radio-home', component: RadioHomeView },
    { path: '/radio/log', name: 'radio-log', component: RadioLogView },
    { path: '/radio/log/new', name: 'radio-log-new', component: RadioLogFormView },
    { path: '/radio/log/:id/edit', name: 'radio-log-edit', component: RadioLogFormView },
    { path: '/radio/qsl', name: 'radio-qsl', component: RadioQslView },
    { path: '/radio/station', name: 'radio-station-edit', component: RadioStationEditView },
    { path: '/radio/:callsign', name: 'radio-station', component: RadioStationView },
  ],
})

export default router
