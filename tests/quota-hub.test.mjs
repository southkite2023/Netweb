import test from 'node:test'
import { projects } from '../src/data/projects.js'
import assert from 'node:assert/strict'
import { detectQuotaPlatform, quotaDownloadUrl, quotaRelease, quotaCopy, applyQuotaManifest } from '../src/data/quotaHub.js'

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
    assert.equal(url.host, 'yuashie.cn')
    assert.equal(url.pathname, `/downloads/astracct/v1.3.0/${`quota-hub-1.3.0-${item.id}.apk`}`)
  }
  for (const platform of ['iOS', 'Linux', null]) assert.equal(quotaDownloadUrl(platform, 'universal'), null)
  assert.equal(quotaDownloadUrl('Android', '../../other'), null)
  for (const locale of ['zh', 'en', 'ja']) {
    for (const item of quotaRelease.packages) assert.ok(quotaCopy[locale].packageHints[item.id])
  }
})


test('desktop downloads use fixed release assets and reject unsupported platforms', () => {
  assert.equal(quotaDownloadUrl('Windows'), 'https://yuashie.cn/downloads/astracct/v1.3.0/astracct-1.3.0-windows-x64.zip')
  assert.equal(quotaDownloadUrl('macOS'), 'https://yuashie.cn/downloads/astracct/v1.3.0/astracct-1.3.0-macos-universal.zip')
  assert.equal(quotaRelease.version, '1.3.0')
  assert.equal(quotaRelease.desktop.Windows.version, '1.3.0')
  assert.equal(quotaRelease.desktop.macOS.version, '1.3.0')
  assert.equal(quotaRelease.latestVersion, '1.3.0')
  assert.equal(quotaRelease.desktop.macOS.releaseUrl, 'https://github.com/southkite2023/quota-hub/releases/tag/v1.3.0')
  for (const locale of ['zh', 'en', 'ja']) assert.ok(quotaCopy[locale].limits.length > 30)
  assert.equal(quotaDownloadUrl('__proto__'), null)
  assert.equal(quotaDownloadUrl('Android', '../../evil'), null)
})



test('release discovery changes metadata and downloads together, rejects untrusted or incomplete updates', () => {
  const old = JSON.parse(JSON.stringify(quotaRelease))
  const asset = (platform, architecture) => ({ platform, architecture, version: '1.4.0', bytes: 1234, sha256: 'a'.repeat(64),
    file: `astracct-1.4.0-${architecture}.${platform === 'android' ? 'apk' : 'zip'}`,
    url: `https://yuashie.cn/downloads/astracct/v1.4.0/astracct-1.4.0-${architecture}.${platform === 'android' ? 'apk' : 'zip'}`,
    releaseUrl: 'https://github.com/southkite2023/quota-hub/releases/tag/v1.4.0' })
  const manifest = { schema: 1, packages: [asset('android', 'universal'), asset('windows', 'windows-x64'), asset('macos', 'macos-universal')] }
  try {
    applyQuotaManifest(manifest)
    assert.equal(quotaRelease.version, '1.4.0')
    assert.equal(projects.find(item => item.id === '001').version, '1.4.0')
    assert.equal(quotaRelease.desktop.Windows.version, '1.4.0')
    assert.equal(quotaDownloadUrl('Android', 'universal'), manifest.packages[0].url)
    const before = JSON.stringify(quotaRelease)
    assert.throws(() => applyQuotaManifest({ ...manifest, packages: manifest.packages.slice(1) }))
    assert.throws(() => applyQuotaManifest({ ...manifest, packages: manifest.packages.map(item => ({ ...item, url: item.url.replace('yuashie.cn', 'evil.example') })) }))
    assert.equal(JSON.stringify(quotaRelease), before)
  } finally { Object.assign(quotaRelease, old) }
})
