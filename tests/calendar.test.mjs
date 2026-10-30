import test from 'node:test'
import assert from 'node:assert/strict'
import { calendarGames, calendarTypes, calendarCopy } from '../src/data/calendar.js'
import { calendarTestUrl, defaultCalendarSelection, CALENDAR_REAL_ANIME_FEEDS, CALENDAR_SEASON_CATALOG_URL, CALENDAR_MERGE_HEALTH_URL, animeShowFeedUrl, mergedAnimeFeedUrl } from '../src/lib/calendar.js'
import { animeSeasonCopy } from '../src/data/animeSeason.js'

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

test('live anime URLs are real, HTTPS and separate from the fictional builder', () => {
  const start = new URL(CALENDAR_REAL_ANIME_FEEDS.start)
  const span = new URL(CALENDAR_REAL_ANIME_FEEDS.duration)
  for (const url of [start, span]) {
    assert.equal(url.protocol, 'https:')
    assert.equal(url.hostname, 'southkite2023.github.io')
    assert.ok(url.pathname.includes('/calendar/real/v1/anime/'))
    assert.ok(url.pathname.endsWith('.ics'))
  }
  assert.ok(start.pathname.endsWith('/start.ics'))
  assert.ok(span.pathname.endsWith('/span.ics'))
  assert.equal(new URL(calendarTestUrl({ anime: true })).hostname, 'calendar.example.invalid')
})

test('current-season catalog and individual show subscription contract', () => {
  const catalog = new URL(CALENDAR_SEASON_CATALOG_URL)
  assert.equal(catalog.hostname, 'southkite2023.github.io')
  assert.equal(catalog.pathname, '/yuashie-calendar/calendar/real/v1/anime/catalog/current-season.json')
  assert.equal(animeShowFeedUrl(206401), 'https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime/shows/206401/span.ics')
  assert.equal(animeShowFeedUrl(206401, 'start'), 'https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime/shows/206401/start.ics')
  for (const id of [0, -1, 2.5, NaN, Infinity, '206401', '../bad']) assert.equal(animeShowFeedUrl(id), null)
  for (const lang of ['zh', 'en', 'ja']) {
    assert.deepEqual(Object.keys(animeSeasonCopy[lang]).sort(), Object.keys(animeSeasonCopy.zh).sort())
  }
})

test('one dynamic subscription URL is canonical for any selection order, and rejects hostile IDs', () => {
  assert.equal(CALENDAR_MERGE_HEALTH_URL, '/api/calendar/v1/health')
  const a = mergedAnimeFeedUrl([206401,123456,206401])
  const b = mergedAnimeFeedUrl([123456,206401])
  assert.equal(a,b)
  const url = new URL(a)
  assert.equal(url.origin, 'https://yuashie.cn')
  assert.equal(url.pathname, '/api/calendar/v1/anime.ics')
  assert.equal(url.searchParams.get('shows'), '123456,206401')
  assert.equal(url.searchParams.get('mode'), 'span')
  assert.equal(new URL(mergedAnimeFeedUrl([206401], 'start')).searchParams.get('mode'), 'start')
  for(const bad of [[], ['206401'], [NaN], [0], [-1], [2.5], [2147483648],
    Array.from({length:81},(_,i)=>i+1)]) assert.equal(mergedAnimeFeedUrl(bad), null)
})
