<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { legalNavigation, policyPaths } from '../data/legalNavigation'
const { locale } = useI18n()
const copy = computed(() => legalNavigation[locale.value] || legalNavigation.zh)
</script>
<template><div class="legal-links" role="navigation" :aria-label="copy.label"><RouterLink v-for="(path, index) in policyPaths" :key="path" :to="path">{{ copy.titles[index] }}</RouterLink></div></template>
