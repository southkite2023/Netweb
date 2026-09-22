import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(resolve(root, p))
const join = paths => Buffer.concat(paths.map(read))
function write(path, data) { const target = resolve(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, data) }
function verify(data, size, sha) {
  const actual = createHash('sha256').update(data).digest('hex')
  if (data.length !== size || actual !== sha) throw new Error(`Live2D asset verification failed: ${data.length} / ${actual}`)
}
const texture = join(['live2d-assets/yuashie/texture_00.webp.part-00','live2d-assets/yuashie/texture_00.webp.part-01'])
verify(texture, 22054, '84e45e852ed696a7076048d9151e34e05daf96a2a532c47b197a4a1545336938')
write('public/assets/live2d/yuashie/Yuashie_Live2D_layered_starter.512/texture_00.webp', texture)
const moc = gunzipSync(join(['live2d-assets/yuashie/model.moc3.gz.part-00','live2d-assets/yuashie/model.moc3.gz.part-01','live2d-assets/yuashie/model.moc3.gz.part-02']))
verify(moc, 71872, '4713ad8850a210005e54f15ee6a3bc6cab2b82d93d7b90666a72c69c067f674c')
write('public/assets/live2d/yuashie/Yuashie_Live2D_layered_starter.moc3', moc)
console.log('Live2D assets prepared.')
