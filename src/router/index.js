import { createRouter, createWebHistory } from 'vue-router'
import { nextTick } from 'vue'
import { navigationPending, navigationError, failedPath } from '../lib/navigation'

const HomeView = () => import('../views/HomeView.vue')
const ProjectsView = () => import('../views/ProjectsView.vue')
const ProjectDetailView = () => import('../views/ProjectDetailView.vue')
const Archive000View = () => import('../views/Archive000View.vue')
const IdentityBackupView = () => import('../views/IdentityBackupView.vue')
const AboutView = () => import('../views/AboutView.vue')
const LegalView = () => import('../views/LegalView.vue')
const VipView = () => import('../views/VipView.vue')
const LoginView = () => import('../views/LoginView.vue')
const RegisterView = () => import('../views/RegisterView.vue')
const ProfileView = () => import('../views/ProfileView.vue')
const FeedbackView = () => import('../views/FeedbackView.vue')
const AdminFeedbackView = () => import('../views/AdminFeedbackView.vue')
const RadioHomeView = () => import('../views/RadioHomeView.vue')
const RadioLogView = () => import('../views/RadioLogView.vue')
const RadioLogFormView = () => import('../views/RadioLogFormView.vue')
const RadioQslView = () => import('../views/RadioQslView.vue')
const RadioStationEditView = () => import('../views/RadioStationEditView.vue')
const RadioStationView = () => import('../views/RadioStationView.vue')

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior() {
    // New pages always start at the top, even with global smooth scrolling.
    return { top: 0, left: 0, behavior: 'instant' }
  },
  routes: [
    { path: '/explore', name: 'explore', component: () => import('../views/ExploreView.vue') },
    { path: '/lab', name: 'signal-lab', component: () => import('../views/SignalLabView.vue') },
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
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') },
  ],
})

router.beforeEach(() => { navigationPending.value = true; navigationError.value = false })
router.afterEach(async (to, from, failure) => {
  navigationPending.value = false
  if (failure) return
  await nextTick()
  const main = document.querySelector('main')
  if (main) { main.id = 'main-content'; main.setAttribute('tabindex', '-1') }
  if (from.name && to.path !== from.path) main?.focus({ preventScroll: true })
})
router.onError((error, to) => {
  navigationPending.value = false
  navigationError.value = true
  failedPath.value = to?.fullPath || ''
  console.error('Route load failed:', error)
})

export default router
