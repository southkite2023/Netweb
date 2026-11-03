<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SiteNav from '../components/SiteNav.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { detectQuotaPlatform, quotaCopy, quotaDesktopCopy, quotaDownloadPackage, quotaDownloadUrl, quotaPlatforms, quotaRelease, quotaReleaseStatus } from '../data/quotaHub'
import '../quota-hub.css'
import { validatedLinuxPackages } from '../data/linuxPackages'
const { locale } = useI18n()
const c = computed(() => quotaCopy[locale.value] || quotaCopy.zh)
const route = useRoute()
const router = useRouter()
const desktopCopy = computed(() => quotaDesktopCopy[locale.value] || quotaDesktopCopy.zh)
const linuxPackages = ref([])
const linuxArch = ref('x86_64')
const linuxFormat = ref('deb')
const linuxFailed = ref(false)
const linuxPackage = computed(() => linuxPackages.value.find(p => p.architecture === linuxArch.value && p.format === linuxFormat.value))
onMounted(async () => {
  try {
    const response = await fetch('/downloads/astracct/latest.json', { cache: 'no-store' })
    if (!response.ok) throw Error('Manifest unavailable')
    linuxPackages.value = validatedLinuxPackages(await response.json())
  } catch { linuxFailed.value = true }
})
const detected = ref(null)
const selectedPlatform = ref('Android')
const architecture = ref('universal')
const selectedPackage = computed(() => quotaDownloadPackage(selectedPlatform.value, architecture.value))
const selectedVersion = computed(() => (selectedPlatform.value === 'Linux' ? linuxPackage.value?.version : selectedPackage.value?.version) || quotaRelease.version)
const selectedReleaseUrl = computed(() => (selectedPlatform.value === 'Linux' && linuxPackage.value ? `https://github.com/southkite2023/quota-hub/releases/tag/v${linuxPackage.value.version}` : selectedPackage.value?.releaseUrl) || quotaRelease.url)
const macDmgUrl = computed(() => selectedPlatform.value === 'macOS' ? quotaRelease.desktop.macOS?.installer?.url || null : null)
const macZipUrl = computed(() => macDmgUrl.value ? `https://yuashie.cn/downloads/astracct/v${selectedVersion.value}/${quotaRelease.desktop.macOS.file}` : null)
const downloadUrl = computed(() => quotaDownloadUrl(selectedPlatform.value, architecture.value))
onMounted(() => {
  detected.value = detectQuotaPlatform(navigator)
  selectedPlatform.value = quotaPlatforms.includes(route.query.platform) ? route.query.platform : detected.value || 'Android'
})
watch(selectedPlatform, platform => {
  if (platform !== route.query.platform) router.replace({ query: { ...route.query, platform }, hash: route.hash })
})
watch(() => route.query.platform, platform => { if (quotaPlatforms.includes(platform)) selectedPlatform.value = platform })
</script>

<template>
  <div class="quota-page quota-download">
    <div class="container"><SiteNav /></div>
    <main>
      <div class="quota-subnav"><RouterLink to="/projects/001">← {{ c.back }}</RouterLink><span>ASTRACCT / {{ selectedPlatform === 'iOS' ? 'PWA' : selectedVersion }}</span></div>
      <section class="quota-hero">
        <div class="quota-hero-orbit" aria-hidden="true"></div>
        <p class="quota-wordmark"><span class="quota-symbol" aria-hidden="true">Q</span> Astracct <span class="quota-beta">{{ c.badge }}</span></p>
        <p class="quota-eyebrow">{{ c.eyebrow }}</p>
        <h1>{{ c.headline[0] }}<br><span>{{ c.headline[1] }}</span></h1>
        <p class="quota-intro">{{ c.intro }}</p>
        <div class="quota-download-controls">
          <p class="quota-device" role="status"><span aria-hidden="true" class="quota-status-dot"></span>{{ detected ? `${c.detected} · ${detected}` : c.unknown }}</p>
          <div class="quota-platforms" role="group" :aria-label="c.choose">
            <button v-for="platform in quotaPlatforms" :key="platform" type="button" :aria-pressed="selectedPlatform === platform" @click="selectedPlatform = platform">{{ platform }}</button>
          </div>
          <div v-if="selectedPlatform === 'iOS'" class="quota-package">
            <p class="quota-fineprint">{{ c.iosPwaIntro }}</p>
            <a class="quota-primary quota-download-button" href="/assets/astracct/?install=1">{{ c.iosPwaInstall }} <span aria-hidden="true">↗</span></a>
            <p class="quota-package-meta">{{ c.iosPwaMeta }}</p>
            <p class="quota-fineprint">{{ c.iosPwaNote }}</p>
          </div>
          <div v-else-if="selectedPlatform === 'Linux'" class="quota-package">
            <label for="linux-arch">{{ locale === 'zh' ? '处理器架构' : 'Processor architecture' }}</label>
            <select id="linux-arch" v-model="linuxArch"><option value="x86_64">x86_64 · Intel / AMD</option><option value="aarch64">ARM64 · AArch64</option></select>
            <label for="linux-format">{{ locale === 'zh' ? '安装方式' : 'Package format' }}</label>
            <select id="linux-format" v-model="linuxFormat"><option value="deb">DEB · Ubuntu 24.04+</option><option value="rpm">RPM · Fedora 40+</option><option value="AppImage">AppImage</option><option value="tar.gz">tar.gz</option></select>
            <template v-if="linuxPackage">
              <a class="quota-primary quota-download-button" :href="linuxPackage.url">{{ locale === 'zh' ? '下载 Linux 版' : 'Download for Linux' }} ↓</a>
              <p class="quota-package-meta">v{{ linuxPackage.version }} · {{ linuxPackage.architecture }} · {{ linuxPackage.format }} · {{ (linuxPackage.bytes / 1000000).toFixed(2) }} MB</p>
              <p class="quota-fineprint">{{ locale === 'zh' ? '公开测试版。需要 glibc 2.39+、GTK 3、libsecret、Ayatana AppIndicator 和已解锁的系统密钥环。已在 Ubuntu 24.04 构建和启动验证；其他发行版尚待实际验收。' : 'Public test build. Requires glibc 2.39+, GTK 3, libsecret, Ayatana AppIndicator and an unlocked system keyring. Built and launch-tested on Ubuntu 24.04; other distributions are not yet verified.' }}</p>
              <p class="quota-fineprint" v-if="linuxFormat === 'deb'">sudo apt install ./{{ linuxPackage.file }}</p>
              <p class="quota-fineprint" v-else-if="linuxFormat === 'rpm'">sudo dnf install ./{{ linuxPackage.file }}</p>
              <p class="quota-fineprint" v-else-if="linuxFormat === 'AppImage'">chmod +x {{ linuxPackage.file }} · ./{{ linuxPackage.file }} --appimage-extract-and-run</p>
              <p class="quota-fineprint" v-else>{{ locale === 'zh' ? '解压全部文件后运行 ./astracct；不要只复制可执行文件。' : 'Extract all files, then run ./astracct. Keep the complete bundle.' }}</p>
              <p class="quota-fineprint">{{ locale === 'zh' ? '升级请手动安装新版。Linux 暂不支持系统身份解锁或自动安装更新；托盘取决于桌面环境。' : 'Install updates manually. System identity unlock and automatic installation are unavailable on Linux; tray support depends on the desktop.' }}</p>
              <details><summary>SHA-256</summary><code style="overflow-wrap:anywhere">{{ linuxPackage.sha256 }}</code></details>
              <a :href="`https://github.com/southkite2023/quota-hub/releases/download/v${linuxPackage.version}/${linuxPackage.file}`">GitHub {{ locale === 'zh' ? '备用下载' : 'fallback' }}</a>
            </template>
            <p v-else role="status">{{ linuxFailed ? (locale === 'zh' ? '暂时无法读取已验证安装包，请稍后重试。' : 'Unable to load verified packages. Please retry later.') : (locale === 'zh' ? '此组合尚无已发布安装包。' : 'No published package for this combination.') }}</p>
          </div>
          <div v-else-if="downloadUrl" class="quota-package">
            <template v-if="selectedPlatform === 'Android'">
            <label for="quota-architecture">{{ c.architecture }}</label>
            <select id="quota-architecture" v-model="architecture" aria-describedby="quota-architecture-note">
              <option v-for="item in quotaRelease.packages" :key="item.id" :value="item.id">{{ c.packageHints[item.id] }} · {{ item.size }}</option>
            </select>
            <p id="quota-architecture-note" class="quota-fineprint">{{ c.architectureHint }}</p>
            </template>
            <p v-if="macDmgUrl" class="quota-fineprint">{{ locale === 'zh' ? '打开 DMG，将 Astracct 拖到 Applications，复制完成后从“应用程序”启动；桌面磁盘可右键选择“推出”。' : locale === 'ja' ? 'DMGを開き、AstracctをApplicationsへドラッグします。コピー後にアプリケーションから起動し、ディスクを取り出してください。' : 'Open the DMG and drag Astracct to Applications. Launch it from Applications after copying, then eject the mounted disk.' }}</p>
            <p v-else-if="selectedPlatform !== 'Android'" class="quota-fineprint">{{ desktopCopy[selectedPlatform] }}</p>
            <a class="quota-primary quota-download-button" :href="downloadUrl">{{ selectedPlatform === 'Android' ? c.download : `${desktopCopy.download} ${selectedPlatform}` }} <span aria-hidden="true">↓</span></a>
            <p class="quota-package-meta">v{{ selectedVersion }} · {{ selectedPackage.label }} · {{ selectedPackage.size }}</p>
            <p class="quota-fineprint">{{ c.hosted }}</p>
            <p v-if="macZipUrl" class="quota-fineprint"><a :href="macZipUrl">{{ locale === 'zh' ? 'ZIP 备用下载（用于解压安装或应用内更新）' : locale === 'ja' ? 'ZIP予備ダウンロード（展開・アプリ内更新用）' : 'ZIP alternative (extraction or in-app updates)' }}</a></p>
            <p v-if="quotaReleaseStatus.failed" role="status" class="quota-fineprint">{{ locale === 'zh' ? '暂时无法检查最新版本，当前显示上次已核验的安装包。' : locale === 'ja' ? '最新版を確認できません。確認済みの配布ファイルを表示しています。' : 'Unable to check for updates. Showing the last verified packages.' }}</p>
            <a :href="`${quotaRelease.repository}/releases/download/v${selectedVersion}/${selectedPackage.file}`" target="_blank" rel="noopener noreferrer">{{ locale === 'zh' ? 'GitHub 备用下载' : locale === 'ja' ? 'GitHub 予備ダウンロード' : 'GitHub fallback download' }}</a>
            <p v-if="selectedPlatform !== 'Android'" class="quota-fineprint">{{ desktopCopy.usage }}</p>
          </div>
          <div v-else class="quota-unavailable" role="status">
            <p>{{ c.unsupported }}</p>
            <button class="quota-primary" disabled>{{ c.unavailable }}</button>
          </div>
          <RouterLink class="quota-guide-link" to="/projects/001/guide">{{ c.guide }} <span aria-hidden="true">→</span></RouterLink>
        </div>
      </section>
      <section class="quota-benefits">
        <p class="quota-eyebrow">ASTRACCT / {{ c.name }}</p>
        <h2>{{ c.overview }}</h2>
        <div class="quota-features"><article v-for="(feature, index) in c.features" :key="feature[0]"><span>0{{ index + 1 }}</span><h3>{{ feature[0] }}</h3><p>{{ feature[1] }}</p></article></div>
        <p class="quota-fineprint">{{ c.limits }}</p>
        <div class="quota-resource-links"><a :href="quotaRelease.repository" target="_blank" rel="noopener noreferrer">{{ c.source }} ↗</a><a :href="selectedReleaseUrl" target="_blank" rel="noopener noreferrer">{{ c.notes }} ↗</a></div>
      </section>
    </main>
    <SiteFooter />
  </div>
</template>
