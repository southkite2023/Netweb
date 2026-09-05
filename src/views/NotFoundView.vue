<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { experienceCopy } from '../data/experience'
const { locale } = useI18n()
const c = computed(() => experienceCopy[locale.value] || experienceCopy.zh)
</script>
<template><div><div class="container"><SiteNav /><main class="experience-main lost-signal"><span class="lost-code" aria-hidden="true">404</span><p class="eyebrow">// COORDINATE NOT FOUND</p><h1>{{ c.missingTitle }}</h1><p>{{ c.missingText }}</p><div class="hero-actions"><RouterLink class="btn btn-primary" to="/">{{ c.backHome }}</RouterLink><RouterLink class="btn btn-secondary" to="/explore">{{ c.explore }}</RouterLink></div></main></div><SiteFooter /></div></template>
