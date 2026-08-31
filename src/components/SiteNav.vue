<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { changeLanguage } from '../i18n'
import { auth } from '../lib/auth'

const { t, locale } = useI18n()
const isLightMode = ref(localStorage.getItem('theme') === 'light')

function applyTheme() {
  document.documentElement.dataset.theme = isLightMode.value ? 'light' : 'dark'
}

function toggleTheme() {
  isLightMode.value = !isLightMode.value
  localStorage.setItem('theme', isLightMode.value ? 'light' : 'dark')
  applyTheme()
}

applyTheme()
</script>

<template>
  <nav>
    <div class="brand-cluster">
      <RouterLink to="/" class="brand">
        <span class="brand-mark"></span>
        <span>YUASHIE</span>
      </RouterLink>

      <button class="theme-toggle" type="button" :aria-label="isLightMode ? 'Switch to dark mode' : 'Switch to light mode'" :title="isLightMode ? 'Dark mode' : 'Light mode'" :aria-pressed="isLightMode" @click="toggleTheme">
        <span aria-hidden="true">{{ isLightMode ? '🌙' : '☀️' }}</span>
      </button>
    </div>

    <div class="nav-right">
      <RouterLink class="nav-link" to="/projects">{{ t('nav.projects') }}</RouterLink>
      <RouterLink class="nav-link" to="/radio">{{ t('nav.radio') }}</RouterLink>
      <RouterLink class="nav-link" to="/about">{{ t('nav.about') }}</RouterLink>
      <RouterLink class="nav-link" to="/vip">{{ t('nav.vip') }}</RouterLink>
      <RouterLink class="nav-link" to="/feedback">{{ t('nav.feedback') }}</RouterLink>
      <RouterLink v-if="auth.user" class="nav-link account-link" :to="`/u/${auth.user.username}`">@{{ auth.user.username }}</RouterLink>
      <RouterLink v-else class="nav-link" to="/login">{{ t('nav.login') }}</RouterLink>

      <div class="language-switcher">
        <button :class="{ active: locale === 'zh' }" @click="changeLanguage('zh')">简体中文</button>
        <span>/</span>
        <button :class="{ active: locale === 'en' }" @click="changeLanguage('en')">English</button>
        <span>/</span>
        <button :class="{ active: locale === 'ja' }" @click="changeLanguage('ja')">日本語</button>
      </div>

      <div class="status"><span class="status-dot"></span>{{ t('terminal.online') }}</div>
    </div>
  </nav>
</template>
