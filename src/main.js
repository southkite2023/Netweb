import { createApp } from 'vue'
import './style.css'
import './glass-ui.css'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { loadSession } from './lib/auth'

loadSession()

createApp(App)
  .use(router)
  .use(i18n)
  .mount('#app')

