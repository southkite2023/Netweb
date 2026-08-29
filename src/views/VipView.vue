<script setup>
import { useI18n } from 'vue-i18n'
import SiteFooter from '../components/SiteFooter.vue'
import SiteNav from '../components/SiteNav.vue'

const { t } = useI18n()
const afdianProfile = 'https://ifdian.net/a/Yuashie'
const afdianEmbed = 'https://ifdian.net/leaflet?slug=Yuashie'
</script>

<template>
  <div class="vip-page">
    <div class="container">
      <SiteNav />

      <main class="vip-main">
        <header class="vip-hero">
          <div class="vip-heading">
            <p class="eyebrow">// SUPPORT CHANNEL · VIP</p>
            <h1>{{ t('vip.title') }}</h1>
          </div>
          <div class="vip-intro">
            <div class="protocol-status"><span class="protocol-status-dot"></span><span>{{ t('vip.status') }}</span></div>
            <p>{{ t('vip.intro') }}</p>
          </div>
        </header>

        <section class="vip-principle">
          <p class="section-label">01 / {{ t('vip.principleLabel') }}</p>
          <div class="vip-principle-grid">
            <h2>{{ t('vip.principleTitle') }}</h2>
            <div>
              <p>{{ t('vip.principleText') }}</p>
              <div class="reward-notice">
                <span>NOTE</span>
                <p>{{ t('vip.noPressure') }}</p>
              </div>
            </div>
          </div>
        </section>

        <section class="vip-notes">
          <article>
            <span>01 / OPEN</span>
            <h3>{{ t('vip.openTitle') }}</h3>
            <p>{{ t('vip.openText') }}</p>
          </article>
          <article>
            <span>02 / MEMBER</span>
            <h3>{{ t('vip.memberTitle') }}</h3>
            <p>{{ t('vip.memberText') }}</p>
          </article>
          <article>
            <span>03 / CONTRIBUTION</span>
            <h3>{{ t('vip.contributionTitle') }}</h3>
            <p>{{ t('vip.contributionText') }}</p>
          </article>
        </section>

        <section class="vip-afdian-section">
          <div class="vip-afdian-copy">
            <p class="section-label">02 / AFDIAN</p>
            <h2>{{ t('vip.afdianTitle') }}</h2>
            <p>{{ t('vip.afdianText') }}</p>
            <p class="vip-soft-note">{{ t('vip.afdianNote') }}</p>
          </div>

          <div class="vip-afdian-panel">
            <div class="vip-panel-meta">
              <span><i></i> AFDIAN / CONNECTED</span>
              <span>YUASHIE</span>
            </div>
            <iframe
              class="afdian-embed"
              :src="afdianEmbed"
              width="100%"
              height="220"
              scrolling="no"
              frameborder="0"
              loading="lazy"
              :title="t('vip.embedTitle')"
            ></iframe>
            <div class="vip-afdian-actions">
              <a class="btn btn-primary" :href="afdianProfile" target="_blank" rel="noopener noreferrer">
                {{ t('vip.openAfdian') }} <span>↗</span>
              </a>
              <span>{{ t('vip.externalNote') }}</span>
            </div>
          </div>
        </section>

        <section class="vip-closing">
          <p class="section-label">03 / {{ t('vip.closingLabel') }}</p>
          <div>
            <h2>{{ t('vip.closingTitle') }}</h2>
            <p>{{ t('vip.closingText') }}</p>
          </div>
        </section>
      </main>
    </div>
    <SiteFooter />
  </div>
</template>
