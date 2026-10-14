/* Generated allowlist: only public, content-versioned images and Live2D files. */
const RESOURCES = __ASSET_RESOURCES__
const PREFIX = 'yuashie-assets-'
const POLICIES = {
  images: { name: PREFIX + 'images-v1', entries: 128, bytes: 32 * 1024 * 1024 },
  live2d: { name: PREFIX + 'live2d-v1', entries: 64, bytes: 64 * 1024 * 1024 },
}
const MAX_AGE = 30 * 24 * 60 * 60 * 1000
const STAMP = 'X-Yuashie-Cached-At'
const SIZE = 'X-Yuashie-Cache-Bytes'
let writes = Promise.resolve()
const pending = new Map()

function enqueue(task) {
  const result = writes.then(task)
  writes = result.catch(() => {})
  return result
}
function fresh(response) {
  const stamp = Number(response.headers.get(STAMP))
  return stamp > 0 && Date.now() - stamp < MAX_AGE
}
async function prune(policy, currentOnly = false) {
  const cache = await caches.open(policy.name)
  const keys = await cache.keys()
  let bytes = 0
  const retained = []
  for (const key of keys) {
    const response = await cache.match(key)
    const path = new URL(key.url).pathname
    if (!response || !fresh(response) || (currentOnly && !RESOURCES[path])) {
      await cache.delete(key)
      continue
    }
    bytes += Number(response.headers.get(SIZE)) || 0
    retained.push({ key, bytes: Number(response.headers.get(SIZE)) || 0 })
  }
  // Cache insertion order is FIFO. Reads don't extend the maximum resource age.
  while (retained.length > policy.entries || bytes > policy.bytes) {
    const oldest = retained.shift()
    bytes -= oldest.bytes
    await cache.delete(oldest.key)
  }
}
async function store(policy, request, response) {
  const headers = new Headers(response.headers)
  if (!response.ok || response.status !== 200 || response.type === 'opaque' || /(?:private|no-store)/i.test(headers.get('Cache-Control') || '') || /text\/html/i.test(headers.get('Content-Type') || '')) return
  const body = await response.arrayBuffer()
  if (body.byteLength > policy.bytes) return
  headers.delete('Content-Encoding')
  headers.set('Content-Length', String(body.byteLength))
  headers.set(STAMP, String(Date.now()))
  headers.set(SIZE, String(body.byteLength))
  const cache = await caches.open(policy.name)
  await cache.put(request, new Response(body, { status: 200, headers }))
  await prune(policy)
}
async function cacheFirst(request, policy) {
  try {
    const cache = await caches.open(policy.name)
    const hit = await cache.match(request)
    if (hit && fresh(hit)) return hit
    if (hit) await cache.delete(request)
  } catch { /* Storage denied/evicted: continue with HTTP cache and network. */ }
  const response = await fetch(request, { credentials: 'omit' })
  // Serialize writes so concurrent textures cannot exceed the byte/count limits.
  return { response, saved: enqueue(() => store(policy, request, response.clone())).catch(() => {}) }
}
self.addEventListener('install', event => {
  // No precache: installation must never start model or image downloads.
  event.waitUntil(self.skipWaiting())
})
self.addEventListener('activate', event => event.waitUntil(enqueue(async () => {
  for (const name of await caches.keys()) {
    if (name.startsWith(PREFIX) && !Object.values(POLICIES).some(policy => policy.name === name)) await caches.delete(name)
  }
  for (const policy of Object.values(POLICIES)) await prune(policy, true)
  await self.clients.claim()
}).catch(() => self.clients.claim())))
self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  const kind = RESOURCES[url.pathname]
  // Full URL match; uploads, API, HTML, third parties, tokens and Astracct's PWA are excluded.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search || request.headers.has('Authorization') || request.headers.has('Range') || !kind) return
  let work = pending.get(url.href)
  if (!work) {
    work = cacheFirst(request, POLICIES[kind])
    pending.set(url.href, work)
    work.then(result => result.saved).catch(() => {}).finally(() => {
      if (pending.get(url.href) === work) pending.delete(url.href)
    })
  }
  event.respondWith(work.then(result => (result.response || result).clone()))
  event.waitUntil(work.then(result => result.saved).catch(() => {}))
})
