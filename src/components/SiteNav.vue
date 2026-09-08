<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { changeLanguage } from '../i18n'
import { auth } from '../lib/auth'
import { isLightMode, toggleTheme } from '../lib/theme'
import { openCommands } from '../lib/navigation'
import { experienceCopy } from '../data/experience'
import { playroomCopy } from '../data/playroom'
const MailboxPanel = defineAsyncComponent(() => import('./MailboxPanel.vue'))
const { t, locale } = useI18n()
const c = computed(() => experienceCopy[locale.value] || experienceCopy.zh)
const router = useRouter()
const mobileMenuOpen = ref(false)
const menuButton = ref(null)
const brandGlitch = ref(false)
let brandClicks = 0
const timers = new Set()
let brandClickTimer
function later(callback, delay) {
  const timer = setTimeout(() => { timers.delete(timer); callback() }, delay)
  timers.add(timer)
  return timer
}
function closeMobileMenu() { mobileMenuOpen.value = false }
function escapeMenu(event) {
  if (event.key === 'Escape' && mobileMenuOpen.value) { closeMobileMenu(); menuButton.value?.focus() }
}
function handleBrandClick(event) {
  closeMobileMenu()
  if (router.currentRoute.value.path !== '/') return
  brandClicks += 1
  clearTimeout(brandClickTimer)
  timers.delete(brandClickTimer)
  if (brandClicks === 4) { brandGlitch.value = true; later(() => { brandGlitch.value = false }, 260) }
  if (brandClicks >= 5) {
    event.preventDefault()
    brandClicks = 0
    brandGlitch.value = true
    later(() => router.push('/projects/000'), 180)
    return
  }
  brandClickTimer = later(() => { brandClicks = 0 }, 1800)
}
watch(() => router.currentRoute.value.path, closeMobileMenu)
onBeforeUnmount(() => { timers.forEach(clearTimeout) })
</script>

<template>
  <nav class="site-nav" :class="{ 'menu-open': mobileMenuOpen }" :aria-label="c.menu" @keydown="escapeMenu">
    <div class="brand-cluster">
      <RouterLink to="/" class="brand" :class="{ 'archive-glitch': brandGlitch }" @click="handleBrandClick"><span class="brand-mark" aria-hidden="true"></span><span>YUASHIE</span></RouterLink>
      <button class="theme-toggle" type="button" :aria-label="isLightMode ? c.dark : c.light" :title="isLightMode ? c.dark : c.light" :aria-pressed="isLightMode" @click="toggleTheme"><span aria-hidden="true">{{ isLightMode ? '🌙' : '☀️' }}</span></button>
    </div>
    <div class="nav-utility">
      <button class="nav-search icon-button" type="button" :aria-label="c.search" :title="c.shortcut + ' · Ctrl / ⌘ K'" @click="closeMobileMenu(); openCommands()"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg></button>
      <MailboxPanel v-if="auth.user" :key="auth.user.username" />
      <button ref="menuButton" class="mobile-nav-toggle" type="button" :aria-expanded="mobileMenuOpen" aria-controls="primary-navigation" :aria-label="mobileMenuOpen ? c.close : c.menu" @click="mobileMenuOpen = !mobileMenuOpen"><span aria-hidden="true">{{ mobileMenuOpen ? '×' : '☰' }}</span></button>
    </div>
    <div id="primary-navigation" class="nav-right" :class="{ 'is-open': mobileMenuOpen }">
      <RouterLink class="nav-link" to="/projects" @click="closeMobileMenu">{{ t('nav.projects') }}</RouterLink>
      <RouterLink class="nav-link" to="/explore" @click="closeMobileMenu">{{ c.explore }}</RouterLink>
      <RouterLink class="nav-link" to="/play" @click="closeMobileMenu">{{ (playroomCopy[locale] || playroomCopy.zh).title }}</RouterLink>
      <RouterLink class="nav-link" to="/radio" @click="closeMobileMenu">{{ t('nav.radio') }}</RouterLink>
      <RouterLink class="nav-link" to="/about" @click="closeMobileMenu">{{ t('nav.about') }}</RouterLink>
      <RouterLink class="nav-link" to="/vip" @click="closeMobileMenu">{{ t('nav.vip') }}</RouterLink>
      <RouterLink class="nav-link" to="/feedback" @click="closeMobileMenu">{{ t('nav.feedback') }}</RouterLink>
      <RouterLink v-if="auth.user" class="nav-link account-link" :to="`/u/${encodeURIComponent(auth.user.username)}`" @click="closeMobileMenu">@{{ auth.user.username }}</RouterLink>
      <RouterLink v-else class="nav-link" to="/login" @click="closeMobileMenu">{{ t('nav.login') }}</RouterLink>
      <label class="language-switcher" :title="c.language"><span class="language-icon" aria-hidden="true">文</span><select :value="locale" :aria-label="c.language" @change="changeLanguage($event.target.value)"><option value="zh">简体中文</option><option value="en">English</option><option value="ja">日本語</option></select></label>
    </div>
  </nav>
</template>

<style scoped>
.archive-glitch{animation:archive-brand-glitch .22s steps(2,end)}
@keyframes archive-brand-glitch{25%{transform:translate(2px,-1px)}50%{transform:translate(-3px,1px);opacity:.72}75%{transform:translate(2px,0)}}
@media(prefers-reduced-motion:reduce){.archive-glitch{animation:none}}
</style>
