<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { legalCopy, legalDocuments, legalPaths } from '../data/legal'
const { locale } = useI18n()
const lang = computed(() => legalCopy[locale.value] ? locale.value : 'zh')
</script>
<template><div class="legal-links" role="navigation" :aria-label="legalCopy[lang].navigation"><RouterLink v-for="(path, key) in legalPaths" :key="key" :to="path">{{ legalDocuments[lang][key].title }}</RouterLink></div></template>
