<script setup>
import { useI18n } from 'vue-i18n'
import SiteFooter from '../components/SiteFooter.vue'
import SiteNav from '../components/SiteNav.vue'

const { t } = useI18n()
</script>

<template>
  <div class="about-page">
    <div class="container">
      <SiteNav />

      <main class="about-main">
        <header class="about-hero">
          <div class="about-heading">
            <p class="eyebrow">// MEMBER PROTOCOL · 001</p>
            <h1>{{ t('membership.title') }}</h1>
          </div>
          <div class="about-intro">
            <div class="protocol-status"><span class="protocol-status-dot"></span><span>{{ t('membership.status') }}</span></div>
            <p>{{ t('membership.intro') }}</p>
          </div>
        </header>

        <section class="membership-principle">
          <p class="section-label">01 / {{ t('membership.principleLabel') }}</p>
          <div class="principle-grid">
            <h2>{{ t('membership.principleTitle') }}</h2>
            <div class="principle-copy">
              <p>{{ t('membership.principleText') }}</p>
              <div class="reward-notice"><span>NOTICE</span><p>{{ t('membership.noRewards') }}</p></div>
            </div>
          </div>
        </section>

        <section class="contribution-section">
          <div class="contribution-header">
            <div>
              <p class="section-label">02 / {{ t('membership.contributionLabel') }}</p>
              <h2>{{ t('membership.contributionTitle') }}</h2>
            </div>
            <p>{{ t('membership.contributionIntro') }}</p>
          </div>

          <div class="contribution-grid">
            <article class="contribution-card">
              <span class="contribution-index">SIGNAL / 01</span>
              <div><h3>{{ t('membership.supportTitle') }}</h3><p>{{ t('membership.supportText') }}</p></div>
              <span class="contribution-mark" aria-hidden="true">＋</span>
            </article>
            <article class="contribution-card">
              <span class="contribution-index">SIGNAL / 02</span>
              <div><h3>{{ t('membership.buildTitle') }}</h3><p>{{ t('membership.buildText') }}</p></div>
              <span class="contribution-mark" aria-hidden="true">◇</span>
            </article>
            <article class="contribution-card">
              <span class="contribution-index">SIGNAL / 03</span>
              <div><h3>{{ t('membership.shareTitle') }}</h3><p>{{ t('membership.shareText') }}</p></div>
              <span class="contribution-mark" aria-hidden="true">↗</span>
            </article>
          </div>

          <div class="contribution-ledger">
            <div class="ledger-meta"><span>{{ t('membership.ledger') }}</span><span>CONCEPT / 0.1</span></div>
            <div class="ledger-track" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
            <p>{{ t('membership.ledgerText') }}</p>
          </div>
        </section>

        <section class="support-section">
          <div class="support-copy">
            <p class="section-label">03 / {{ t('membership.supportLabel') }}</p>
            <h2>{{ t('membership.afdianTitle') }}</h2>
            <p>{{ t('membership.afdianText') }}</p>
            <p class="support-hint">{{ t('membership.vipHint') }}</p>
          </div>

          <div class="afdian-station">
            <span class="station-corner station-corner-top"></span><span class="station-corner station-corner-bottom"></span>
            <RouterLink class="afdian-logo-button" to="/vip" :aria-label="t('membership.vipEntry')">
              <span class="afdian-bolt" aria-hidden="true">⚡</span>
              <span class="afdian-wordmark"><strong>{{ t('membership.vipEntry') }}</strong><small>VIP / AFDIAN</small></span>
            </RouterLink>
            <div class="station-status">
              <span><i></i>{{ t('membership.channelOnline') }}</span>
              <RouterLink to="/vip">{{ t('membership.vipLink') }} →</RouterLink>
            </div>
          </div>
        </section>

        <section class="membership-closing">
          <p class="section-label">04 / {{ t('membership.nextLabel') }}</p>
          <div><h2>{{ t('membership.nextTitle') }}</h2><p>{{ t('membership.nextText') }}</p></div>
        </section>
      </main>
    </div>
    <SiteFooter />
  </div>
</template>
