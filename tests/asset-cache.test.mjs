import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'

const template = readFileSync(new URL('../src/service-worker.js', import.meta.url), 'utf8')
function worker({ resources = { '/assets/image-hash.webp': 'images', '/media/live2d/version/model.moc3': 'live2d' }, fetcher, smallLimits = false } = {}) {
  const listeners = {}, storage = new Map(), downloads = []
  const origin = 'https://yuashie.cn'
  const key = request => typeof request === 'string' ? new URL(request, origin).href : request.url
  const caches = {
    async keys() { return [...storage.keys()] },
    async delete(name) { return storage.delete(name) },
    async open(name) {
      if (!storage.has(name)) storage.set(name, new Map())
      const entries = storage.get(name)
      return {
        async keys() { return [...entries.keys()].map(url => new Request(url)) },
        async match(request) { return entries.get(key(request))?.clone() },
        async put(request, response) { entries.set(key(request), response.clone()) },
        async delete(request) { return entries.delete(key(request)) },
      }
    },
  }
  let source = template.replace('__ASSET_RESOURCES__', JSON.stringify(resources))
  if (smallLimits) source = source.replace('entries: 128', 'entries: 2').replace('32 * 1024 * 1024', '32')
  vm.runInNewContext(source, { URL, Request, Response, Headers, Date, Promise, Map, caches,
    fetch: async (request, options) => {
      downloads.push({ url: request.url, options })
      return fetcher ? fetcher(request, options) : new Response('image', { headers: { 'Content-Type': 'image/webp' } })
    },
    self: { location: { origin }, skipWaiting: async () => {}, clients: { claim: async () => {} }, addEventListener: (name, callback) => { listeners[name] = callback } },
  })
  async function send(path, init) {
    let response, lifetime = []
    listeners.fetch({ request: new Request(new URL(path, origin), init), respondWith: p => { response = p }, waitUntil: p => lifetime.push(p) })
    if (!response) return null
    const result = await response
    await Promise.all(lifetime)
    return result
  }
  async function activate() { let done; listeners.activate({ waitUntil: promise => { done = promise } }); await done }
  return { send, caches, downloads, activate }
}

test('first download caches the resource, repeat reads locally without sending credentials', async () => {
  const w = worker()
  assert.equal(await (await w.send('/assets/image-hash.webp')).text(), 'image')
  assert.equal(await (await w.send('/assets/image-hash.webp')).text(), 'image')
  assert.equal(w.downloads.length, 1)
  assert.equal(w.downloads[0].options.credentials, 'omit')
})
test('API, uploads, HTML, nested PWA, query tokens, writes, Range and Authorization bypass cache', async () => {
  const w = worker()
  for (const path of ['/api/session', '/user-content/avatar.webp', '/', '/assets/astracct/app.js', 'https://other.test/image.webp', '/assets/image-hash.webp?token=secret']) assert.equal(await w.send(path), null)
  for (const init of [{ method: 'POST' }, { headers: { Authorization: 'Bearer secret' } }, { headers: { Range: 'bytes=0-10' } }]) assert.equal(await w.send('/assets/image-hash.webp', init), null)
  assert.equal(w.downloads.length, 0)
  assert.equal((await w.caches.keys()).length, 0)
})
test('private/no-store/error/HTML fallback responses never enter cache', async () => {
  for (const response of [new Response('private', { headers: { 'Cache-Control': 'private' } }), new Response('secret', { headers: { 'Cache-Control': 'no-store' } }), new Response('missing', { status: 404 }), new Response('<html>', { headers: { 'Content-Type': 'text/html' } })]) {
    const w = worker({ fetcher: () => response.clone() })
    await w.send('/assets/image-hash.webp')
    await w.send('/assets/image-hash.webp')
    assert.equal(w.downloads.length, 2)
  }
})
test('expired resources re-download and activation removes obsolete versions without touching Astracct', async () => {
  const w = worker()
  const cache = await w.caches.open('yuashie-assets-images-v1')
  await cache.put('https://yuashie.cn/assets/image-hash.webp', new Response('old', { headers: { 'X-Yuashie-Cached-At': String(Date.now() - 31 * 86400000), 'X-Yuashie-Cache-Bytes': '3' } }))
  assert.equal(await (await w.send('/assets/image-hash.webp')).text(), 'image')
  await cache.put('https://yuashie.cn/assets/old-version.webp', new Response('old', { headers: { 'X-Yuashie-Cached-At': String(Date.now()), 'X-Yuashie-Cache-Bytes': '3' } }))
  await w.caches.open('astracct-shell-test')
  await w.activate()
  assert.equal((await cache.keys()).length, 1)
  assert.ok((await w.caches.keys()).includes('astracct-shell-test'))
})
test('concurrent texture writes obey both count and byte budgets', async () => {
  const resources = Object.fromEntries([1, 2, 3].map(i => [`/assets/${i}.webp`, 'images']))
  for (const body of ['small', 'this image uses twenty bytes']) {
    const w = worker({ resources, smallLimits: true, fetcher: () => new Response(body) })
    await Promise.all(Object.keys(resources).map(path => w.send(path)))
    const cache = await w.caches.open('yuashie-assets-images-v1')
    const keys = await cache.keys()
    assert.ok(keys.length <= 2)
    let bytes = 0
    for (const key of keys) bytes += Number((await cache.match(key)).headers.get('X-Yuashie-Cache-Bytes'))
    assert.ok(bytes <= 32)
  }
})
test('oversized resources remain usable but uncached; denied storage still downloads', async () => {
  const w = worker({ smallLimits: true, fetcher: () => new Response('x'.repeat(33)) })
  assert.equal((await (await w.send('/assets/image-hash.webp')).text()).length, 33)
  assert.equal((await (await w.caches.open('yuashie-assets-images-v1')).keys()).length, 0)
  w.caches.open = async () => { throw new Error('Quota denied') }
  assert.equal((await (await w.send('/assets/image-hash.webp')).text()).length, 33)
})
test('simultaneous readers share one download, and cached Live2D still works offline', async () => {
  let offline = false
  const w = worker({ fetcher: async () => {
    if (offline) throw new Error('Offline')
    await new Promise(resolve => setTimeout(resolve, 5))
    return new Response('MOC3 fixture')
  } })
  const results = await Promise.all([w.send('/media/live2d/version/model.moc3'), w.send('/media/live2d/version/model.moc3')])
  assert.deepEqual(await Promise.all(results.map(response => response.text())), ['MOC3 fixture', 'MOC3 fixture'])
  assert.equal(w.downloads.length, 1)
  offline = true
  assert.equal(await (await w.send('/media/live2d/version/model.moc3')).text(), 'MOC3 fixture')
  assert.equal(w.downloads.length, 1)
})
