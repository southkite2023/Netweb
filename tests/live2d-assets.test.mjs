import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../public/assets/live2d/mizuiro')
test('compressed companion model preserves the original bytes and every referenced asset exists', () => {
  const raw = readFileSync(resolve(root, 'model.moc3'))
  const compressed = readFileSync(resolve(root, 'model.moc3.gz'))
  assert.deepEqual(gunzipSync(compressed), raw)
  assert.ok(compressed.length < raw.length * .6)
  const { FileReferences: files } = JSON.parse(readFileSync(resolve(root, 'model.model3.json'), 'utf8'))
  for (const path of [files.Moc, files.Physics, ...files.Textures, ...files.Expressions.map(e => e.File), ...Object.values(files.Motions).flat().map(m => m.File)]) {
    assert.ok(existsSync(resolve(root, path)), `Missing companion asset: ${path}`)
  }
})
