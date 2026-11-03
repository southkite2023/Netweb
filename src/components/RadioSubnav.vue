<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { auth } from '../lib/auth'

const { locale } = useI18n()
const copy = computed(() => ({
  zh: { home: '电台首页', log: '通联日志', newLog: '新增 QSO', qsl: 'QSL', station: '我的电台', lab: '信号实验室' },
  en: { home: 'RADIO HOME', log: 'QSO LOG', newLog: 'NEW QSO', qsl: 'QSL', station: 'MY STATION', lab: 'SIGNAL LAB' },
  ja: { home: '無線ホーム', log: 'QSOログ', newLog: 'QSO追加', qsl: 'QSL', station: 'マイ無線局', lab: '信号実験室' },
}[locale.value]))
</script>

<template>
  <nav class="radio-subnav" aria-label="Yuashie Radio navigation">
    <div class="radio-subnav-links">
      <RouterLink to="/003/radio">{{ copy.home }}</RouterLink>
      <RouterLink to="/003/radio/log">{{ copy.log }}</RouterLink>
      <RouterLink to="/003/radio/log/new">{{ copy.newLog }}</RouterLink>
      <RouterLink to="/003/radio/qsl">{{ copy.qsl }}</RouterLink>
      <RouterLink to="/003/radio/station">{{ copy.station }}</RouterLink>
      <RouterLink to="/003/lab">{{ copy.lab }}</RouterLink>
    </div>
    <RouterLink v-if="auth.user?.radioProfile" class="radio-callsign-chip" :to="`/003/radio/${auth.user.radioProfile.callsign}`">
      <span aria-hidden="true">📻</span>{{ auth.user.radioProfile.callsign }}<span v-if="auth.user.radioProfile.verificationStatus === 'verified'">✓</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
/* Global nav has a fixed site-header height; this tool navigation wraps on phones. */
.radio-subnav { height: auto; }
</style>
