let registrationPromise
export function registerAssetCache() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return Promise.resolve(null)
  if (!registrationPromise) registrationPromise = navigator.serviceWorker.register('/sw.js', {
    scope: '/', updateViaCache: 'none',
  }).catch(error => { console.warn('[Asset cache] Online fallback:', error); return null })
  return registrationPromise
}

// A short first-visit grace period lets both images and model downloads use the worker.
// Denied storage, disabled workers and unsupported browsers fall back to normal HTTP.
export function waitForAssetCache(timeout = 500) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return Promise.resolve()
  return new Promise(resolve => {
    const done = () => { clearTimeout(timer); navigator.serviceWorker.removeEventListener('controllerchange', check); resolve() }
    const check = () => { if (navigator.serviceWorker.controller?.scriptURL === new URL('/sw.js', location.href).href) done() }
    const timer = setTimeout(done, timeout)
    navigator.serviceWorker.addEventListener('controllerchange', check)
    registerAssetCache().then(registration => { if (!registration) done(); else check() })
    check()
  })
}
