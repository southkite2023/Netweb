<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { legalCopy, legalDocuments } from '../data/legal'
const props = defineProps({ kind: { type: String, required: true } })
const { locale } = useI18n()
const lang = computed(() => legalCopy[locale.value] ? locale.value : 'zh')
const text = computed(() => legalCopy[lang.value][props.kind])
</script>
<template><aside class="privacy-notice"><p>{{ text }}</p><RouterLink to="/privacy" target="_blank" rel="noopener">{{ legalDocuments[lang].privacy.title }} ↗</RouterLink></aside></template>
