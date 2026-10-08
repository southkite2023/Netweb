import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { quotaCopy, detectQuotaPlatform } from '../src/data/quotaHub.js'

const root = resolve(import.meta.dirname, '../public/assets/astracct')
const source = file => readFileSync(resolve(root, file), 'utf8')

test('Astracct iOS PWA has a scoped installable manifest and offline app shell', () => {
  const manifest = JSON.parse(source('manifest.json'))
  assert.equal(manifest.id, '/assets/astracct/')
  assert.equal(manifest.start_url, '/assets/astracct/')
  assert.equal(manifest.scope, '/assets/astracct/')
  assert.equal(manifest.display, 'standalone')
  assert.ok(manifest.icons.some(i => i.sizes === '192x192'))
  assert.ok(manifest.icons.some(i => i.sizes === '512x512'))
  const html = source('index.html')
  assert.match(html, /rel="manifest"/)
  assert.match(html, /apple-touch-icon/)
  assert.match(html, /id="installDialog"/)
  const sw = source('sw.js')
  assert.match(sw, /astracct-shell-/)
  assert.match(sw, /u\.pathname\.startsWith\(ROOT\)/)
  assert.match(source('app.js'), /serviceWorker\.register\('\.\/sw\.js', \{scope: '\.\/'\}\)/)
})

test('Astracct PWA PNG icons have the declared dimensions', () => {
  for (const size of [192, 512]) {
    const png = readFileSync(resolve(root, `icon-${size}.png`))
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.equal(png.readUInt32BE(16), size)
    assert.equal(png.readUInt32BE(20), size)
  }
})

test('iOS download page offers the PWA for iPhone and desktop-mode iPad', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../src/views/QuotaDownloadView.vue'), 'utf8')
  assert.match(page, /selectedPlatform === 'iOS'/)
  assert.match(page, /href="\/assets\/astracct\/\?install=1"/)
  assert.equal(detectQuotaPlatform({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X)'}), 'iOS')
  assert.equal(detectQuotaPlatform({platform:'MacIntel',maxTouchPoints:5}), 'iOS')
  for (const locale of ['zh','en','ja']) {
    assert.ok(quotaCopy[locale].iosPwaInstall)
    assert.ok(quotaCopy[locale].iosPwaNote)
  }
})
