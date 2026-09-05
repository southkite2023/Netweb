import test from 'node:test'
import assert from 'node:assert/strict'
import { encodeMorse, morseTimeline } from '../src/lib/morse.js'
import { searchEntries } from '../src/lib/search.js'
import { readPreference, writePreference } from '../src/lib/preferences.js'
import { request } from '../src/lib/api.js'

test('Morse normalizes input and reports unsupported characters without silently dropping them', () => {
  assert.deepEqual(encodeMorse('  ｃｑ\n73  '), { code: '-.-. --.- / --... ...--', unsupported: [] })
  assert.deepEqual(encodeMorse('你好你好').unsupported, ['你', '好'])
  assert.equal(encodeMorse('Hello, world!').code, '.... . .-.. .-.. --- --..-- / .-- --- .-. .-.. -.. -.-.--')
  assert.equal(encodeMorse('   ').code, '')
})

test('Morse uses distinct element, letter and word gaps with no extra trailing gap', () => {
  const atOneSecond = morseTimeline('.- . / .', 1.2) // clamped to 5 WPM: 0.24 s/dot
  const starts = atOneSecond.tones.map(tone => Math.round(tone.start / .24))
  assert.deepEqual(starts, [0, 2, 8, 16])
  assert.ok(Math.abs(atOneSecond.duration - 17 * .24) < 1e-9)
  // PARIS has 43 units; the standard trailing word gap adds seven to make 50.
  assert.ok(Math.abs(morseTimeline(encodeMorse('PARIS').code, 20).duration - 43 * .06) < 1e-9)
  assert.deepEqual(morseTimeline(''), { tones: [], duration: 0 })
  assert.throws(() => morseTimeline('�'), /Invalid Morse/)
})

const entries = [
  { path: '/projects/002', title: 'Minecraft 服务器', description: '纯净生存', category: 'projects', keywords: 'game' },
  { path: '/radio/qsl', title: '电子 QSL', description: '卡片', category: 'pages', keywords: 'card' },
]
test('Search handles multilingual text, width, whitespace and combined filters', () => {
  assert.equal(searchEntries(entries, '  ＭＩＮＥＣＲＡＦＴ  服务器 ')[0].path, '/projects/002')
  assert.equal(searchEntries(entries, '卡片')[0].path, '/radio/qsl')
  assert.equal(searchEntries(entries, '', { category: 'pages' }).length, 1)
  assert.equal(searchEntries(entries, '', { category: 'saved', favorites: ['/radio/qsl'] })[0].path, '/radio/qsl')
  assert.deepEqual(searchEntries(entries, 'minecraft', { category: 'saved', favorites: ['/radio/qsl'] }), [])
  assert.deepEqual(searchEntries(entries, 'does not exist'), [])
})

test('Preference helpers tolerate denied browser storage', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Denied') } })
  try { assert.equal(readPreference('theme', 'dark'), 'dark'); assert.equal(writePreference('theme', 'light'), false) }
  finally { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage }
})

test('API preserves credentials and payload, and rejects misleading success responses', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/example')
    assert.equal(options.credentials, 'include')
    assert.equal(options.headers.get('Content-Type'), 'application/json')
    assert.equal(options.body, '{"text":"你好"}')
    return new Response('{"ok":true}')
  })
  assert.deepEqual(await request('/example', { method: 'POST', body: '{"text":"你好"}' }), { ok: true })
  globalThis.fetch = async () => new Response('<html>login</html>', { status: 200 })
  await assert.rejects(request('/example'), /无法识别/)
  globalThis.fetch = async () => new Response('{"message":"No access"}', { status: 403 })
  await assert.rejects(request('/example'), error => error.status === 403 && error.message === 'No access')
  globalThis.fetch = async () => new Response(null, { status: 204 })
  assert.deepEqual(await request('/example'), {})
})

test('API timeout aborts once, cleans up and never retries a write automatically', async t => {
  let calls = 0, onTimeout, cleared = false
  t.mock.method(globalThis, 'setTimeout', callback => { onTimeout = callback; return 1 })
  t.mock.method(globalThis, 'clearTimeout', () => { cleared = true })
  t.mock.method(globalThis, 'fetch', async (_, options) => {
    calls++
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
  })
  const pending = request('/feedback', { method: 'POST', body: '{}' })
  onTimeout()
  await assert.rejects(pending, /超时/)
  assert.equal(calls, 1)
  assert.equal(cleared, true)
})

test('API respects caller cancellation', async t => {
  const controller = new AbortController()
  controller.abort()
  t.mock.method(globalThis, 'fetch', async (_, options) => {
    assert.equal(options.signal.aborted, true)
    throw new DOMException('Aborted', 'AbortError')
  })
  await assert.rejects(request('/example', { signal: controller.signal }), { name: 'AbortError' })
})
