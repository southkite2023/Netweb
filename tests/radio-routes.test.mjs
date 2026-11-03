import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRouter, createMemoryHistory } from 'vue-router'

const source = await readFile(new URL('../src/router/index.js', import.meta.url), 'utf8')
const routesSource = source.split('  routes: [')[1].split('\n  ],')[0]
const views = [...new Set(routesSource.match(/\b\w+View\b/g))]
const routes = Function(...views, `return [${routesSource}]`)(...views.map(() => ({})))
// Use the production paths and redirects without loading browser-only view modules.
const router = createRouter({ history: createMemoryHistory(), routes: routes.map(route => route.redirect ? route : { ...route, component: {} }) })

test('project 003 tools and all station/log children have canonical routes', () => {
  for (const [path, name] of [
    ['/003/lab', 'signal-lab'], ['/003/radio', 'radio-home'],
    ['/003/radio/log', 'radio-log'], ['/003/radio/log/new', 'radio-log-new'],
    ['/003/radio/log/42/edit', 'radio-log-edit'], ['/003/radio/qsl', 'radio-qsl'],
    ['/003/radio/station', 'radio-station-edit'], ['/003/radio/BG8ABC', 'radio-station'],
  ]) assert.equal(router.resolve(path).name, name, path)
})

test('legacy tool and deep URLs preserve query and hash on redirect', async () => {
  for (const path of ['/lab', '/radio', '/radio/log', '/radio/log/new', '/radio/log/42/edit', '/radio/qsl', '/radio/station', '/radio/BG8ABC']) {
    await router.push(`${path}?q=CQ%20CQ#details`)
    assert.equal(router.currentRoute.value.path, `/003${path}`)
    assert.deepEqual(router.currentRoute.value.query, { q: 'CQ CQ' })
    assert.equal(router.currentRoute.value.hash, '#details')
  }
})

test('unrelated prefixes remain not-found routes', () => {
  for (const path of ['/radiology', '/laboratory', '/003/radio/log/42/delete']) assert.equal(router.resolve(path).name, 'not-found')
})
