export function readPreference(key, fallback = '') {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}

export function writePreference(key, value) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('preference-change', { detail: { key, value } }))
  try { localStorage.setItem(key, value); return true } catch { return false }
}
