import test from 'node:test'
import assert from 'node:assert/strict'
import { calendarGames, calendarTypes, calendarCopy } from '../src/data/calendar.js'
import { calendarTestUrl, defaultCalendarSelection } from '../src/lib/calendar.js'

test('empty and unknown selections cannot produce a feed URL', () => {
  assert.equal(calendarTestUrl({ games: {}, anime: false, releases: false }), null)
  assert.equal(calendarTestUrl({ games: { unknown: ['banner'], genshin: ['unknown'] } }), null)
})

test('URL contract keeps per-game filters, categories, display mode and explicit test status', () => {
  const url = new URL(calendarTestUrl({ games: { genshin: ['banner'], 'star-rail': ['preview', 'version'] }, anime: true, releases: true, mode: 'duration' }))
  assert.equal(url.hostname, 'calendar.example.invalid')
  assert.equal(url.pathname, '/v1/feed.ics')
  assert.equal(url.searchParams.get('genshin'), 'banner')
  assert.equal(url.searchParams.get('star-rail'), 'version,preview')
  assert.equal(url.searchParams.get('categories'), 'games,anime,releases')
  assert.equal(url.searchParams.get('mode'), 'duration')
  assert.equal(url.searchParams.get('tz'), 'Asia/Shanghai')
  assert.equal(url.searchParams.get('schema'), '1')
  assert.equal(url.searchParams.get('test'), '1')
})

test('category-only feeds work and untrusted game/type values never enter the URL', () => {
  const url = new URL(calendarTestUrl({ games: { genshin: ['banner', '../bad', 'banner'], bad: ['version'] }, anime: true, mode: 'invalid' }))
  assert.equal(url.searchParams.get('mode'), 'start')
  assert.equal(url.searchParams.get('genshin'), 'banner')
  assert.equal(url.searchParams.has('bad'), false)
  assert.equal(new URL(calendarTestUrl({ releases: true })).searchParams.get('categories'), 'releases')
  assert.equal(new URL(calendarTestUrl({ anime: true })).searchParams.get('categories'), 'anime')
})

test('defaults are independent and all four games and UI strings support three locales', () => {
  const first = defaultCalendarSelection()
  first.games.genshin.pop()
  assert.equal(defaultCalendarSelection().games.genshin.length, 3)
  for (const game of calendarGames) assert.ok(Array.isArray(first.games[game.id]))
  for (const lang of ['zh', 'en', 'ja']) {
    assert.deepEqual(Object.keys(calendarCopy[lang]).sort(), Object.keys(calendarCopy.zh).sort())
    for (const game of calendarGames) assert.ok(game[lang])
    for (const type of calendarTypes) assert.ok(calendarCopy[lang].types[type])
  }
})
