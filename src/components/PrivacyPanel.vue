<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { privacyOpen, savePrivacy } from '../lib/privacy'
const custom = ref(false)
const { locale } = useI18n()
const c = computed(() => ({
 zh: { title: 'Cookie 与隐私偏好', body: '我们使用必要的登录 Cookie，以及保存语言、主题和本地收藏的浏览器存储。当前没有广告或非必要追踪；所有选择都不会影响登录与云端同步。', all: '全部接受', only: '仅必要', custom: '自定义设置', necessary: '必要存储：始终启用', optional: '非必要追踪：未使用，保持关闭', save: '保存设置', policy: '隐私政策' },
 en: { title: 'Cookies and privacy', body: 'Essential login cookies and browser storage support language, theme and local bookmarks. No advertising or optional tracking is installed. All choices allow sign-in and cloud sync.', all: 'Accept all', only: 'Necessary only', custom: 'Customize', necessary: 'Essential storage: enabled', optional: 'Optional tracking: not used, disabled', save: 'Save settings', policy: 'Privacy policy' },
 ja: { title: 'Cookieとプライバシー', body: 'ログインCookieと、言語・テーマ・保存用のブラウザストレージを使用します。広告や任意の追跡はありません。どの選択でもログインと同期を利用できます。', all: 'すべて許可', only: '必須のみ', custom: '設定', necessary: '必須ストレージ：有効', optional: '任意の追跡：未使用・無効', save: '保存', policy: 'プライバシーポリシー' }
}[locale.value] || {}))
function save(choice) { savePrivacy(choice); custom.value = false }
</script>
<template><Teleport to="body"><section v-if="privacyOpen" class="privacy-banner" role="region" :aria-label="c.title"><h2>{{ c.title }}</h2><p>{{ c.body }}</p><p v-if="custom">{{ c.necessary }}<br>{{ c.optional }}</p><RouterLink to="/privacy">{{ c.policy }}</RouterLink><div><button @click="save('all')">{{ c.all }}</button><button @click="save('necessary')">{{ c.only }}</button><button v-if="!custom" @click="custom = true">{{ c.custom }}</button><button v-else @click="save('custom')">{{ c.save }}</button></div></section></Teleport></template>
<style>
.privacy-banner,.privacy-card{padding:24px;border:1px solid var(--line);border-radius:18px;background:var(--bg);color:var(--text);box-shadow:0 15px 60px #0005}.privacy-banner{position:fixed;bottom:16px;left:16px;right:16px;max-width:680px;margin:auto;z-index:4000}.privacy-banner h2{font-size:20px}.privacy-banner p{font-size:14px;line-height:1.7;margin:10px 0}.privacy-banner button,.privacy-card button{padding:9px 13px;margin:8px 8px 0 0;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--text);cursor:pointer}.privacy-banner a{color:var(--accent)}.privacy-backdrop{position:fixed;inset:0;background:#0008;z-index:3500;display:grid;place-items:center;padding:20px}.privacy-card{max-width:700px;width:100%;max-height:85vh;overflow:auto}
</style>
