import test from 'node:test'
import assert from 'node:assert/strict'
import { validatedLinuxPackages } from '../src/data/linuxPackages.js'
const item = { platform: 'linux', architecture: 'x86_64', format: 'deb', version: '3.4.0', file: 'Astracct-Linux-3.4.0-x86_64.deb', url: 'https://yuashie.cn/downloads/astracct/v3.4.0/Astracct-Linux-3.4.0-x86_64.deb', bytes: 100, sha256: 'a'.repeat(64) }
test('Linux downloads require real version-matched same-origin metadata', () => {
 assert.equal(validatedLinuxPackages({linuxPackages:[item]})[0].format, 'deb')
 for (const change of [{url:'https://evil.example/file'}, {version:'3.5.0'}, {bytes:0}, {sha256:'bad'}, {architecture:'arm'}, {format:'exe'}]) assert.throws(() => validatedLinuxPackages({linuxPackages:[{...item,...change}]}))
 assert.deepEqual(validatedLinuxPackages({}), [])
})
