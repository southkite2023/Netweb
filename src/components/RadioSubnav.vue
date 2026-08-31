<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { auth } from '../lib/auth'

const { locale } = useI18n()
const copy = computed(() => ({
  zh: { home: '电台首页', log: '通联日志', newLog: '新增 QSO', qsl: 'QSL', station: '我的电台' },
  en: { home: 'RADIO HOME', log: 'QSO LOG', newLog: 'NEW QSO', qsl: 'QSL', station: 'MY STATION' },
  ja: { home: '無線ホーム', log: 'QSOログ', newLog: 'QSO追加', qsl: 'QSL', station: 'マイ無線局' },
}[locale.value]))
</script>

<template>
  <div class="radio-subnav" aria-label="Yuashie Radio navigation">
    <div class="radio-subnav-links">
      <RouterLink to="/radio">{{ copy.home }}</RouterLink>
      <RouterLink to="/radio/log">{{ copy.log }}</RouterLink>
      <RouterLink to="/radio/log/new">{{ copy.newLog }}</RouterLink>
      <RouterLink to="/radio/qsl">{{ copy.qsl }}</RouterLink>
      <RouterLink to="/radio/station">{{ copy.station }}</RouterLink>
    </div>
    <RouterLink v-if="auth.user?.radioProfile" class="radio-callsign-chip" :to="`/radio/${auth.user.radioProfile.callsign}`">
      <span aria-hidden="true">📻</span>{{ auth.user.radioProfile.callsign }}<span v-if="auth.user.radioProfile.verificationStatus === 'verified'">✓</span>
    </RouterLink>
  </div>
</template>
