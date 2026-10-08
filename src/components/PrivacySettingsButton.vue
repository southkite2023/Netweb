<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { openPrivacy } from '../lib/privacy'
const { locale } = useI18n()
const label = computed(() => ({ zh: 'Cookie · 隐私偏好', en: 'Cookie · Privacy settings', ja: 'Cookie · プライバシー設定' }[locale.value]))
</script>
<template><button class="privacy-settings-link" type="button" @click="openPrivacy">{{ label }}</button></template>
<style scoped>.privacy-settings-link{padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--muted);font:inherit;font-size:12px;cursor:pointer}.privacy-settings-link:hover{color:var(--accent);border-color:var(--accent)}</style>
