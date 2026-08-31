<script setup>
import { useI18n } from 'vue-i18n'
import LegalLinks from './LegalLinks.vue'
import beianIcon from '../assets/beian-icon.png'

const { t } = useI18n()
</script>

<template>
  <footer>
    <div class="container footer-content">
      <div class="footer-main">
        <span>Copyright © 2026-至今 北住孤居</span>
        <span>{{ t('footer.status') }}</span>
      </div>
      <LegalLinks />
      <div class="filing-links">
        <a class="filing-link" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">蜀ICP备2026050398号-1</a>
        <a class="filing-link public-security-link" href="https://beian.mps.gov.cn/#/query/webSearch?code=51050202000608" target="_blank" rel="noopener noreferrer">
          <img class="beian-icon" :src="beianIcon" alt="" aria-hidden="true"><span>川公网安备51050202000608号</span>
        </a>
      </div>
    </div>
  </footer>
</template>
