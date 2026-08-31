<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { changeLanguage } from '../i18n'
import { auth } from '../lib/auth'
import MailboxPanel from './MailboxPanel.vue'

const { t, locale } = useI18n()
const router = useRouter()
const isLightMode = ref(localStorage.getItem('theme') === 'light')
const mobileMenuOpen = ref(false)
const brandGlitch = ref(false)
let brandClicks = 0
let brandClickTimer

function applyTheme() {
  document.documentElement.dataset.theme = isLightMode.value ? 'light' : 'dark'
}

function toggleTheme() {
  isLightMode.value = !isLightMode.value
  localStorage.setItem('theme', isLightMode.value ? 'light' : 'dark')
  applyTheme()
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

function handleBrandClick(event) {
  closeMobileMenu()
  if (router.currentRoute.value.path !== '/') return
  brandClicks += 1
  window.clearTimeout(brandClickTimer)
  if (brandClicks === 4) {
    brandGlitch.value = true
    window.setTimeout(() => { brandGlitch.value = false }, 260)
  }
  if (brandClicks >= 5) {
    event.preventDefault()
    brandClicks = 0
    brandGlitch.value = true
    window.setTimeout(() => router.push('/projects/000'), 180)
    return
  }
  brandClickTimer = window.setTimeout(() => { brandClicks = 0 }, 1800)
}

function onLanguageChange(event) {
  changeLanguage(event.target.value)
}

applyTheme()
</script>

<template>
  <nav class="site-nav" :class="{ 'menu-open': mobileMenuOpen }">
    <div class="brand-cluster">
      <RouterLink to="/" class="brand" :class="{ 'archive-glitch': brandGlitch }" @click="handleBrandClick">
        <span class="brand-mark"></span>
        <span>YUASHIE</span>
      </RouterLink>
      <button class="theme-toggle" type="button" :aria-label="isLightMode ? 'Switch to dark mode' : 'Switch to light mode'" :title="isLightMode ? 'Dark mode' : 'Light mode'" :aria-pressed="isLightMode" @click="toggleTheme">
        <span aria-hidden="true">{{ isLightMode ? '🌙' : '☀️' }}</span>
      </button>
    </div>

    <div class="nav-utility">
      <MailboxPanel v-if="auth.user" />
      <button class="mobile-nav-toggle" type="button" :aria-expanded="mobileMenuOpen" aria-label="Toggle navigation" @click="toggleMobileMenu">
        <span aria-hidden="true">{{ mobileMenuOpen ? '×' : '☰' }}</span>
      </button>
    </div>

    <div class="nav-right" :class="{ 'is-open': mobileMenuOpen }">
      <RouterLink class="nav-link" to="/projects" @click="closeMobileMenu">{{ t('nav.projects') }}</RouterLink>
      <RouterLink class="nav-link" to="/radio" @click="closeMobileMenu">{{ t('nav.radio') }}</RouterLink>
      <RouterLink class="nav-link" to="/about" @click="closeMobileMenu">{{ t('nav.about') }}</RouterLink>
      <RouterLink class="nav-link" to="/vip" @click="closeMobileMenu">{{ t('nav.vip') }}</RouterLink>
      <RouterLink class="nav-link" to="/feedback" @click="closeMobileMenu">{{ t('nav.feedback') }}</RouterLink>
      <RouterLink v-if="auth.user" class="nav-link account-link" :to="`/u/${auth.user.username}`" @click="closeMobileMenu">@{{ auth.user.username }}</RouterLink>
      <RouterLink v-else class="nav-link" to="/login" @click="closeMobileMenu">{{ t('nav.login') }}</RouterLink>
      <label class="language-switcher" title="Language">
        <span class="language-icon" aria-hidden="true">文</span>
        <select :value="locale" aria-label="Language" @change="onLanguageChange">
          <option value="zh">简体中文</option>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </label>
      <div class="status"><span class="status-dot"></span>{{ t('terminal.online') }}</div>
    </div>
  </nav>
</template>

<style scoped>
.archive-glitch{animation:archive-brand-glitch .22s steps(2,end)}
.nav-utility{display:flex;align-items:center;gap:9px;flex:0 0 auto}
@keyframes archive-brand-glitch{0%{transform:translate(0);filter:none}25%{transform:translate(2px,-1px);filter:contrast(1.8)}50%{transform:translate(-3px,1px);opacity:.72}75%{transform:translate(2px,0)}100%{transform:translate(0);filter:none}}
@media(min-width:821px){.nav-utility{order:2}.nav-right{order:3}.site-nav{gap:18px}.mailbox-entry{margin-left:auto}}
@media(max-width:820px){.site-nav{display:grid;grid-template-columns:minmax(0,1fr) auto;position:relative}.brand-cluster{min-width:0}.nav-utility{grid-column:2;grid-row:1}.nav-right{grid-column:1/-1}.brand>span:last-child{white-space:nowrap}}
@media(prefers-reduced-motion:reduce){.archive-glitch{animation:none}}
</style>
