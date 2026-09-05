export function readPreference(key, fallback = '') {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}

export function writePreference(key, value) {
  try { localStorage.setItem(key, value); return true } catch { return false }
}
