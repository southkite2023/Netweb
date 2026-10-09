import test from 'node:test'
import assert from 'node:assert/strict'
import { scrollBehavior } from '../src/lib/scroll.js'

const route = (path, query = {}, hash = '') => ({ path, query, hash })

test('download platform changes and other same-page filters preserve the viewport', () => {
  for (const path of ['/projects/001/download', '/project', '/radio/log']) {
    assert.equal(scrollBehavior(route(path, { platform: 'macOS', q: 'new' }), route(path, { platform: 'Android', q: 'old' })), false)
    assert.equal(scrollBehavior(route(path), route(path, { q: 'old' })), false)
  }
  assert.equal(scrollBehavior(route('/project', { q: 'new' }, '#results'), route('/project', {}, '#results')), false)
})

test('back and forward restore saved positions even within the same page', () => {
  const saved = { left: 12, top: 840 }
  for (const from of [route('/project'), route('/projects/001/download')]) {
    assert.deepEqual(scrollBehavior(route('/projects/001/download'), from, saved), { ...saved, behavior: 'instant' })
  }
  assert.deepEqual(saved, { left: 12, top: 840 })
})

test('new pages start at the top and explicit anchors remain navigable', () => {
  assert.deepEqual(scrollBehavior(route('/about'), route('/project')), { left: 0, top: 0, behavior: 'instant' })
  assert.deepEqual(scrollBehavior(route('/about', {}, '#contact'), route('/about')), { el: '#contact', behavior: 'instant' })
  assert.deepEqual(scrollBehavior(route('/about'), route('/about', {}, '#contact')), { left: 0, top: 0, behavior: 'instant' })
})
