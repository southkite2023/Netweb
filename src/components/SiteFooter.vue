<script setup>
import LegalLinks from './LegalLinks.vue'
import { SITE_VERSION } from '../data/version'
import beianIcon from '../assets/beian-icon.png'

</script>

<template>
  <footer>
    <div class="container footer-content">
      <div class="footer-main">
        <span>Copyright © 2026-至今 北住孤居</span>
        <RouterLink to="/about">YUASHIE · v{{ SITE_VERSION }}</RouterLink>
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
