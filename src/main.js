import './account-auth.css'
import { createApp } from 'vue'
import { waitForAssetCache } from './lib/assetCache'

import './style.css'
import './glass-ui.css'
import './experience.css'
import './modular-ui.css'
import './interaction-motion.css'
import './rounded-ui.css'
import { initializeInteractionMotion } from './lib/interactionMotion'
import { applyTheme } from './lib/theme'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { loadSession } from './lib/auth'
import { refreshQuotaRelease } from './data/quotaHub'
import { initializeCloud } from './lib/cloudSync'

initializeInteractionMotion()
initializeCloud()
applyTheme()
loadSession()

waitForAssetCache().then(() => {
  createApp(App)
    .use(router)
    .use(i18n)
    .mount('#app')
})


refreshQuotaRelease()
window.addEventListener('focus', refreshQuotaRelease)
window.addEventListener('online', refreshQuotaRelease)
setInterval(() => { if (!document.hidden) refreshQuotaRelease() }, 60000)
