import { createApp } from 'vue'
import './style.css'
import './glass-ui.css'
import './experience.css'
import { applyTheme } from './lib/theme'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { loadSession } from './lib/auth'

applyTheme()
loadSession()

createApp(App)
  .use(router)
  .use(i18n)
  .mount('#app')

