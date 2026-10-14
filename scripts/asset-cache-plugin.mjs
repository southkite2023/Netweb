import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const digest = data => createHash('sha256').update(data).digest('hex').slice(0, 16)
export function assetCachePlugin() {
  let root, groups, icons
  const virtual = '\0virtual:live2d-assets'
  return {
    name: 'yuashie-asset-cache',
    configResolved(config) {
      root = config.root
      icons = ['favicon.png', 'apple-touch-icon.png'].map(name => {
        const data = readFileSync(resolve(root, 'public', name))
        return { name, data, url: `/assets/cached/icons/${digest(data)}/${name}` }
      })
      groups = Object.fromEntries(['mizuiro', 'runtime'].map(group => {
        const directory = resolve(root, 'public/assets/live2d', group)
        const files = readdirSync(directory).sort().map(name => ({ name, data: readFileSync(resolve(directory, name)) }))
        const version = digest(Buffer.concat(files.flatMap(file => [Buffer.from(file.name + '\0'), file.data])))
        return [group, { files, base: `/assets/cached/live2d/${group}/${version}/` }]
      }))
    },
    transformIndexHtml(html) {
      for (const icon of icons) html = html.replace(`/${icon.name}?v=3`, icon.url)
      return html
    },
    resolveId(id) { if (id === 'virtual:live2d-assets') return virtual },
    load(id) {
      if (id === virtual) return `export const modelBase=${JSON.stringify(groups.mizuiro.base)};export const runtimeBase=${JSON.stringify(groups.runtime.base)};`
    },
    // Keep development online-only. Serve the same versioned URLs without registering a worker.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        for (const { files, base } of Object.values(groups)) {
          const file = files.find(file => req.url === base + file.name)
          if (!file) continue
          res.setHeader('Content-Type', file.name.endsWith('.json') ? 'application/json' : file.name.endsWith('.js') ? 'text/javascript' : file.name.endsWith('.webp') ? 'image/webp' : 'application/octet-stream')
          res.end(file.data)
          return
        }
        next()
      })
    },
    generateBundle(_, bundle) {
      const resources = {}
      for (const icon of icons) {
        this.emitFile({ type: 'asset', fileName: icon.url.slice(1), source: icon.data })
        resources[icon.url] = 'images'
      }
      for (const { files, base } of Object.values(groups)) {
        for (const file of files) {
          const fileName = (base + file.name).slice(1)
          this.emitFile({ type: 'asset', fileName, source: file.data })
          // License and readme files are published alongside the model, but never cached.
          if (/\.(?:js|json|moc3|gz|webp|png|jpe?g)$/i.test(file.name)) resources['/' + fileName] = 'live2d'
        }
      }
      for (const file of Object.values(bundle)) {
        if (/\.(?:avif|webp|png|jpe?g|gif|svg|ico)$/i.test(file.fileName)) resources['/' + file.fileName] = 'images'
      }
      const template = readFileSync(resolve(root, 'src/service-worker.js'), 'utf8')
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: template.replace('__ASSET_RESOURCES__', JSON.stringify(resources)) })
    },
  }
}
