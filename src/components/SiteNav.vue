<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { changeLanguage } from '../i18n'
import { auth } from '../lib/auth'

const { t, locale } = useI18n()
const isLightMode = ref(localStorage.getItem('theme') === 'light')
const mobileMenuOpen = ref(false)

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

function onLanguageChange(event) {
  changeLanguage(event.target.value)
}

applyTheme()
</script>

<template>
  <nav class="site-nav" :class="{ 'menu-open': mobileMenuOpen }">
    <div class="brand-cluster">
      <RouterLink to="/" class="brand" @click="closeMobileMenu">
        <span class="brand-mark"></span>
        <span>YUASHIE</span>
      </RouterLink>

      <button class="theme-toggle" type="button" :aria-label="isLightMode ? 'Switch to dark mode' : 'Switch to light mode'" :title="isLightMode ? 'Dark mode' : 'Light mode'" :aria-pressed="isLightMode" @click="toggleTheme">
        <span aria-hidden="true">{{ isLightMode ? '🌙' : '☀️' }}</span>
      </button>
    </div>

    <button
      class="mobile-nav-toggle"
      type="button"
      :aria-expanded="mobileMenuOpen"
      aria-label="Toggle navigation"
      @click="toggleMobileMenu"
    >
      <span aria-hidden="true">{{ mobileMenuOpen ? '×' : '☰' }}</span>
    </button>

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
