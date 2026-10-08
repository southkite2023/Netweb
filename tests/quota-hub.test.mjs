import test from 'node:test'
import assert from 'node:assert/strict'
import { detectQuotaPlatform, quotaDownloadUrl, quotaRelease, quotaCopy } from '../src/data/quotaHub.js'

test('device detection distinguishes Android, iPhone and desktop-mode iPad', () => {
  assert.equal(detectQuotaPlatform({ userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9)', platform: 'Linux aarch64' }), 'Android')
  assert.equal(detectQuotaPlatform({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', platform: 'iPhone' }), 'iOS')
  assert.equal(detectQuotaPlatform({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', platform: 'MacIntel', maxTouchPoints: 5 }), 'iOS')
  assert.equal(detectQuotaPlatform({ platform: 'MacIntel', maxTouchPoints: 0 }), 'macOS')
  assert.equal(detectQuotaPlatform({ platform: 'Win32' }), 'Windows')
  assert.equal(detectQuotaPlatform({ platform: 'Linux x86_64' }), 'Linux')
  assert.equal(detectQuotaPlatform({ userAgentData: { platform: 'Android' } }), 'Android')
  assert.equal(detectQuotaPlatform({ userAgent: 'Unrecognized browser' }), null)
  assert.equal(detectQuotaPlatform(), null)
})

test('only verified Android architecture choices produce direct APK links', () => {
  for (const item of quotaRelease.packages) {
    const url = new URL(quotaDownloadUrl('Android', item.id))
    assert.equal(url.host, 'github.com')
    assert.equal(url.pathname, `/southkite2023/quota-hub/releases/download/v${quotaRelease.version}/astracct-${quotaRelease.version}-${item.id}.apk`)
  }
  for (const platform of ['iOS', 'Linux', null]) assert.equal(quotaDownloadUrl(platform, 'universal'), null)
  assert.equal(quotaDownloadUrl('Android', '../../other'), null)
  for (const locale of ['zh', 'en', 'ja']) {
    for (const item of quotaRelease.packages) assert.ok(quotaCopy[locale].packageHints[item.id])
  }
})


test('desktop downloads use fixed release assets and reject unsupported platforms', () => {
  assert.equal(quotaDownloadUrl('Windows'), 'https://github.com/southkite2023/quota-hub/releases/download/v0.9.0/astracct-0.9.0-windows-x64.zip')
  assert.equal(quotaDownloadUrl('macOS'), 'https://github.com/southkite2023/quota-hub/releases/download/v0.9.0/astracct-0.9.0-macos-universal.zip')
  assert.equal(quotaDownloadUrl('__proto__'), null)
  assert.equal(quotaDownloadUrl('Android', '../../evil'), null)
})
