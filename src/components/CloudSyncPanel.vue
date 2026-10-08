<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { cloud, importLocal, skipImport } from '../lib/cloudSync'
import { auth } from '../lib/auth'
import { request } from '../lib/api'
const { locale } = useI18n()
const c = computed(() => ({
 zh: { title: '账号云端同步', import: '发现此浏览器的旧收藏、已读记录或偏好。是否导入当前账号？原始本地资料会保留，云端偏好优先。', yes: '导入当前账号', no: '保留在本地', devices: '登录设备', close: '关闭', revoke: '退出此设备', current: '当前设备' },
 en: { title: 'Account Cloud Sync', import: 'Import this browser’s saved pages, read history and preferences into this account? Local originals are retained; existing cloud preferences take priority.', yes: 'Import into this account', no: 'Keep locally', devices: 'Signed-in devices', close: 'Close', revoke: 'Sign out device', current: 'This device' },
 ja: { title: 'クラウド同期', import: 'このブラウザの保存、既読、設定をこのアカウントにインポートしますか？元のデータは保持され、クラウド設定が優先されます。', yes: 'インポート', no: 'ローカルに保持', devices: 'ログイン端末', close: '閉じる', revoke: 'ログアウト', current: 'この端末' }
}[locale.value] || {}))
const open = ref(false), sessions = ref([]), error = ref(''), dialog = ref(null)
let previousFocus
watch(open, async value => {
 if (value) { previousFocus = document.activeElement; await nextTick(); dialog.value?.focus() }
 else if (previousFocus?.isConnected) previousFocus.focus()
})
function onDialogKey(event) {
 if (event.key !== 'Tab') return
 const controls = [...dialog.value.querySelectorAll('button:not(:disabled)')]
 const first = controls[0], last = controls.at(-1)
 if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last?.focus() }
 else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
watch(() => auth.user?.id, () => { sessions.value = []; open.value = false; error.value = '' })
async function load() {
 const id = auth.user?.id
 open.value = true; error.value = ''
 try { const data = await request('/auth/sessions'); if (auth.user?.id === id) sessions.value = data.sessions } catch(e) { if (auth.user?.id === id) error.value = e.message }
}
async function revoke(s) {
 const id = auth.user?.id
 try { await request(`/auth/sessions/${s.id}`, { method: 'DELETE' }); if (auth.user?.id !== id) return; if (s.current) { auth.user = null; open.value = false } else await load() } catch(e) { error.value = e.message }
}
</script>
<template>
 <aside v-if="auth.user" class="cloud-status" aria-live="polite">
  <template v-if="cloud.importPending"><strong>{{ c.title }} · @{{ auth.user.username }}</strong><p>{{ c.import }}</p><button :disabled="cloud.importing" @click="importLocal">{{ c.yes }}</button><button :disabled="cloud.importing" @click="skipImport">{{ c.no }}</button></template>
  <p v-if="cloud.error" role="alert">{{ cloud.error }}</p>
  <button @click="load">{{ c.devices }}</button>
 </aside>
 <Teleport to="body"><div v-if="open" class="privacy-backdrop" @click.self="open = false" @keydown.esc="open = false"><section ref="dialog" class="privacy-card" @keydown="onDialogKey" role="dialog" aria-modal="true" :aria-label="c.devices" tabindex="-1"><h2>{{ c.devices }}</h2><p v-if="error" role="alert">{{ error }}</p><ul><li v-for="s in sessions" :key="s.id"><p>{{ s.device }} <strong v-if="s.current">{{ c.current }}</strong></p><small>{{ new Date(s.createdAt).toLocaleString() }}</small> <button @click="revoke(s)">{{ c.revoke }}</button></li></ul><button @click="open = false">{{ c.close }}</button></section></div></Teleport>
</template>
<style scoped>.cloud-status{position:relative;margin:12px auto;padding:16px;max-width:900px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--text)}button{margin:6px;padding:8px 12px;color:var(--text);background:var(--card);border:1px solid var(--line);border-radius:8px;cursor:pointer}li{overflow-wrap:anywhere;margin-bottom:15px}</style>
