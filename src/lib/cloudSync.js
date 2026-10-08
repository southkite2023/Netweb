import { reactive, watch } from 'vue'
import { auth } from './auth'
import { request, setRequestAccount } from './api'
import { readPreference, writePreference } from './preferences'
import { setTheme } from './theme'
import i18n, { changeLanguage } from '../i18n'

export const cloud = reactive({ favorites: [], ready: false, error: '', importing: false, importPending: false, pendingWrites: 0, pendingFavorites: [] })
let generation = 0
let writeRevision = 0
let refreshSequence = 0
let writing = Promise.resolve()
function storedArray(key) {
  try { const value = JSON.parse(readPreference(key, '[]')); return Array.isArray(value) ? value.filter(x => typeof x === 'string') : [] } catch { return [] }
}
export const guestFavorites = () => storedArray('yuashie-saved-pages')
const marker = () => `yuashie-cloud-import-v1:${auth.user?.id}`
const message = () => ({ zh: '云端同步失败，请刷新后重试；原本本地资料仍保留。', en: 'Cloud sync failed. Refresh to retry; original local data is retained.', ja: '同期に失敗しました。再読み込みして再試行してください。元のローカルデータは保持されています。' }[i18n.global.locale.value] || 'Cloud sync failed.')
export async function refreshCloud() {
  if (!auth.user || cloud.pendingWrites) return
  const g = generation, revision = writeRevision, sequence = ++refreshSequence
  try {
    const data = await request('/sync')
    if (g !== generation || revision !== writeRevision || sequence !== refreshSequence || cloud.pendingWrites) return
    cloud.favorites = data.favorites
    if (data.preferences.language) changeLanguage(data.preferences.language, false)
    if (data.preferences.theme) setTheme(data.preferences.theme, false)
    cloud.ready = true; cloud.error = ''
  } catch (e) { if (g === generation) { if (e.status === 401) auth.user = null; else cloud.error = message() } }
}
function writeCloud(path, options) {
  const g = generation
  writeRevision++
  cloud.pendingWrites++
  writing = writing.catch(() => {}).then(async () => {
    if (g !== generation || !auth.user) return
    try { await request(path, options); if (g === generation) cloud.error = '' }
    catch (e) { if (g === generation) cloud.error = message(); throw e }
  }).finally(() => { if (g === generation) cloud.pendingWrites-- })
  return writing
}
export async function toggleFavorite(path) {
  if (!cloud.ready || cloud.pendingFavorites.includes(path)) return
  const g = generation
  cloud.pendingFavorites.push(path)
  const saved = !cloud.favorites.includes(path)
  try {
    await writeCloud('/sync/favorites', { method: 'PUT', body: JSON.stringify({ path, saved }) })
    await refreshCloud()
  } catch { /* The visible error is retained; no false success. */ }
  finally { if (g === generation) cloud.pendingFavorites = cloud.pendingFavorites.filter(p => p !== path) }
}
export async function importLocal() {
  if (!auth.user || cloud.importing) return
  const id = auth.user.id, g = generation
  cloud.importing = true
  const preferences = {}
  const language = readPreference('preferred-language'), theme = readPreference('theme')
  if (['zh','en','ja'].includes(language)) preferences.language = language
  if (['dark','light'].includes(theme)) preferences.theme = theme
  try {
    await writeCloud('/sync/import', { method: 'POST', body: JSON.stringify({ favorites: guestFavorites(), reads: storedArray(`yuashie_mailbox_read:${auth.user.username}`), preferences }) })
    if (g !== generation) return
    writePreference(`yuashie-cloud-import-v1:${id}`, 'done')
    cloud.importPending = false
    await refreshCloud()
    window.dispatchEvent(new Event('cloud-imported'))
  } catch { /* Keep source data and allow retry. */ }
  finally { if (g === generation) cloud.importing = false }
}
export function skipImport() { writePreference(marker(), 'skipped'); cloud.importPending = false }
export function initializeCloud() {
  watch(() => auth.user?.id, async () => {
    setRequestAccount(auth.user?.id)
    generation++; cloud.pendingWrites = 0; cloud.pendingFavorites = []; cloud.ready = false; cloud.favorites = []; cloud.error = ''; cloud.importing = false; cloud.importPending = false
    if (!auth.user) return
    cloud.importPending = !readPreference(marker()) && (guestFavorites().length > 0 || storedArray(`yuashie_mailbox_read:${auth.user.username}`).length > 0 || !!readPreference('preferred-language') || !!readPreference('theme'))
    await refreshCloud()
  }, { immediate: true, flush: 'sync' })
  window.addEventListener('preference-change', e => {
    if (!auth.user || !cloud.ready) return
    const key = e.detail.key === 'theme' ? 'theme' : e.detail.key === 'preferred-language' ? 'language' : null
    if (key) writeCloud('/sync/preferences', { method: 'PATCH', body: JSON.stringify({ [key]: e.detail.value }) }).catch(() => {})
  })
  window.addEventListener('focus', refreshCloud)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshCloud() })
  setInterval(() => { if (!document.hidden) refreshCloud() }, 60000)
}
