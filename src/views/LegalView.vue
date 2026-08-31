<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { legalVersion, legalCopy, legalDocuments, legalPaths, contactIssueUrl } from '../data/legal'
const props = defineProps({ documentId: { type: String, required: true } })
const { locale } = useI18n()
const lang = computed(() => legalCopy[locale.value] ? locale.value : 'zh')
const copy = computed(() => legalCopy[lang.value])
const references = {
  terms: { title: '中华人民共和国民法典', url: 'https://www.moj.gov.cn/pub/sfbgw/zwgkztzl/2025nianzhuanti/2025mfdxcy/2025mfdxcy_mfdql/202505/t20250507_518708.html' },
  privacy: { title: '中华人民共和国个人信息保护法', url: 'https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm' },
  works: { title: '全国人大常委会关于修改著作权法的决定（2020）', url: 'https://www.nppa.gov.cn/xxfb/ywxx/202011/t20201112_664217.html' },
}
const doc = computed(() => legalDocuments[lang.value][props.documentId])
function jump(id) {
  const target = document.getElementById(id)
  target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
  target?.focus({ preventScroll: true })
}
</script>
<template>
  <div class="legal-page"><div class="container"><SiteNav />
    <main class="legal-main" :lang="lang === 'zh' ? 'zh-CN' : lang">
      <RouterLink class="legal-back" to="/about">← {{ copy.back }}</RouterLink>
      <header class="legal-heading"><p class="eyebrow">// YUASHIE · {{ documentId.toUpperCase() }}</p><h1>{{ doc.title }}</h1><p class="legal-version">{{ copy.version }} {{ legalVersion }} · {{ copy.effective }}</p><p class="legal-lead">{{ doc.lead }}</p></header>
      <nav class="legal-tabs" :aria-label="copy.navigation"><RouterLink v-for="(path, key) in legalPaths" :key="key" :to="path" :aria-current="documentId === key ? 'page' : undefined">{{ legalDocuments[lang][key].title }}</RouterLink></nav>
      <div class="legal-layout">
        <aside class="legal-toc"><p>{{ copy.contents }}</p><button v-for="part in doc.sections" :key="part.id" type="button" @click="jump(part.id)">{{ part.title }}</button><button type="button" @click="jump('contact')">{{ copy.contact }}</button></aside>
        <article class="legal-body">
          <section v-for="(part, index) in doc.sections" :id="part.id" :key="part.id" tabindex="-1" class="legal-section"><h2>{{ part.title }}</h2><p v-for="paragraph in part.paragraphs" :key="paragraph">{{ paragraph }}</p>
            <div v-if="doc.rows && index === 0" class="privacy-table-scroll" tabindex="0" role="region" :aria-label="doc.title"><table class="privacy-table"><caption>{{ doc.summary }}</caption><thead><tr><th v-for="label in copy.table" :key="label" scope="col">{{ label }}</th></tr></thead><tbody><tr v-for="row in doc.rows" :key="row[0]"><th scope="row">{{ row[0] }}</th><td>{{ row[1] }}</td><td>{{ row[2] }}</td></tr></tbody></table></div>
          </section>
          <section id="contact" tabindex="-1" class="legal-section legal-contact"><h2>{{ copy.contact }}</h2><p>{{ copy.contactText }}</p><div class="legal-contact-links"><RouterLink to="/feedback">{{ copy.feedback }} →</RouterLink><a :href="contactIssueUrl" target="_blank" rel="noopener noreferrer">{{ copy.issues }} ↗</a></div></section>
          <p class="legal-translation">{{ copy.translation }}</p>
          <p class="legal-reference"><a :href="references[documentId].url" target="_blank" rel="noopener noreferrer">{{ { zh: '相关法律原文（中文）', en: 'Legal reference (Chinese)', ja: '関連法令（中国語）' }[lang] }}：{{ references[documentId].title }} ↗</a></p>
        </article>
      </div>
    </main>
  </div><SiteFooter /></div>
</template>
