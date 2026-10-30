import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { parseSelection, mergeAnimeCalendar, registerCalendarFeed } from '../src/calendar-feed.js'

const event = (id, uid, seq=0, status='CONFIRMED') => [
  'BEGIN:VEVENT',
  `UID:${uid}@calendar.yuashie.cn`,
  `URL:https://anilist.co/anime/${id}`,
  `SUMMARY:Show ${id}`,
  `SEQUENCE:${seq}`,
  `STATUS:${status}`,
  'DTSTART:20261101T100000Z',
  'END:VEVENT',
].join('\r\n')
const original = [
  'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AniList//Yuashie//ZH',
  event(206401, '11111111-2222-4333-8444-555555555555', 3, 'CANCELLED'),
  event(123456, 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
  event(999999, 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff'),
  'END:VCALENDAR', '',
].join('\r\n')

test('canonical selection rejects unexpected parameters, path injection and oversized inputs', () => {
  assert.deepEqual(parseSelection({ shows: '206401,123456,206401', mode: 'span' }),
    { shows: [123456, 206401], mode: 'span', lang: 'ja' })
  assert.equal(parseSelection({ shows: '206401' }).mode, 'span')
  assert.deepEqual(parseSelection({ shows: '206401', lang: 'zh-CN' }),
    { shows: [206401], mode: 'span', lang: 'zh-CN' })
  for (const bad of [
    {}, { shows: '0' }, { shows: '-1' }, { shows: '001' },
    { shows: '206401,abc' }, { shows: '206401/' }, { shows: '206401%2C1' },
    { shows: '206401', mode: 'duration' }, { shows: '206401', lang: 'en' }, { shows: ['1', '2'] },
    { shows: '206401', url: 'https://evil.example' },
    { shows: Array.from({ length: 81 }, (_, i) => String(i+1)).join(',') },
  ]) assert.equal(parseSelection(bad), null)
})

test('merge preserves exact upstream VEVENT fields, UID, SEQUENCE and CANCELLED status', () => {
  const result = mergeAnimeCalendar(original, [206401, 123456])
  assert.ok(result.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'))
  assert.equal((result.match(/BEGIN:VEVENT/g) || []).length, 2)
  assert.ok(result.includes('SEQUENCE:3\r\nSTATUS:CANCELLED'))
  assert.ok(result.includes('UID:11111111-2222-4333-8444-555555555555@calendar.yuashie.cn'))
  assert.ok(!result.includes('Show 999999'))
  assert.equal((mergeAnimeCalendar(original, [42]).match(/BEGIN:VEVENT/g) || []).length, 0)
  assert.ok(mergeAnimeCalendar(original, [42]).endsWith('END:VCALENDAR\r\n'))
})

test('invalid or malicious upstream ICS fails rather than emitting corrupt content', () => {
  assert.throws(() => mergeAnimeCalendar('BEGIN:VCALENDAR\r\nEND:VCALENDAR', [206401]), /Invalid upstream/)
  assert.throws(() => mergeAnimeCalendar(original.replace('URL:https://anilist.co', 'URL:https://evil.example'), [206401]), /Unexpected upstream/)
  assert.throws(() => mergeAnimeCalendar(original.replace('END:VEVENT', 'BEGIN:VEVENT'), [206401]), /Nested VEVENT/)
  assert.throws(() => mergeAnimeCalendar(original.replace('UID:11111111', 'UID:../../'), [206401]), /Untrusted/)
})

test('Fastify serves one valid merged subscription, HEAD, ETag and public health', async t => {
  let calls = 0
  const app = Fastify()
  registerCalendarFeed(app, { fetcher: async (url, options) => {
    calls++
    assert.equal(url, 'https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime/span.ics')
    assert.equal(options.redirect, 'error')
    return new Response(original, { status: 200, headers: { 'content-type': 'text/calendar' } })
  } })
  t.after(() => app.close())

  const health = await app.inject({ method: 'GET', url: '/api/calendar/v1/health' })
  assert.equal(health.statusCode, 200)
  assert.equal(health.json().service, 'anime-ics-selection')

  const resp = await app.inject({ method: 'GET', url: '/api/calendar/v1/anime.ics?shows=206401,123456&mode=span' })
  assert.equal(resp.statusCode, 200)
  assert.match(resp.headers['content-type'], /text\/calendar/)
  assert.ok(resp.headers['cache-control'].includes('max-age=120'))
  assert.equal((resp.body.match(/BEGIN:VEVENT/g) || []).length, 2)
  assert.equal(calls, 1)
  const second = await app.inject({ method: 'GET', url: '/api/calendar/v1/anime.ics?shows=123456,206401&mode=span',
    headers: { 'if-none-match': resp.headers.etag } })
  assert.equal(second.statusCode, 304)
  assert.equal(calls, 1)
  const head = await app.inject({ method: 'HEAD', url: '/api/calendar/v1/anime.ics?shows=206401' })
  assert.equal(head.statusCode, 200)
  assert.equal(head.body, '')
  assert.equal(calls, 1)

  const invalid = await app.inject({ method: 'GET', url: '/api/calendar/v1/anime.ics?shows=1&mode=oops' })
  assert.equal(invalid.statusCode, 400)
})

test('unavailable upstream returns 503, never empty calendar; serves recent validated stale cache', async t => {
  let clock = 1000
  let calls = 0
  const app = Fastify({ logger: false })
  registerCalendarFeed(app, {
    clock: () => clock,
    fetcher: async () => {
      calls++
      if (calls > 1) throw new Error('AniList unavailable')
      return new Response(original, { status: 200 })
    },
  })
  t.after(() => app.close())

  const url = '/api/calendar/v1/anime.ics?shows=206401'
  assert.equal((await app.inject({ url })).statusCode, 200)
  clock += 6 * 60 * 1000
  const stale = await app.inject({ url })
  assert.equal(stale.statusCode, 200)
  assert.match(stale.headers['cache-control'], /must-revalidate/)
  clock += 7 * 60 * 60 * 1000
  const expired = await app.inject({ url })
  assert.equal(expired.statusCode, 503)
})

test('Chinese source selected by fixed filename and isolated cache; Japanese URLs remain unchanged', async t => {
  const seen = []
  const chinese = original.replace('SUMMARY:Show 206401', 'SUMMARY:FX战士久留美')
  const app = Fastify()
  registerCalendarFeed(app, { fetcher: async url => {
    seen.push(url)
    return new Response(url.endsWith('span.zh-CN.ics') ? chinese : original, { status: 200 })
  } })
  t.after(() => app.close())
  const health = (await app.inject({ url: '/api/calendar/v1/health' })).json()
  assert.equal(health.version, 2)
  assert.deepEqual(health.languages, ['ja', 'zh-CN'])
  const zh = await app.inject({ url: '/api/calendar/v1/anime.ics?shows=206401&mode=span&lang=zh-CN' })
  const ja = await app.inject({ url: '/api/calendar/v1/anime.ics?shows=206401&mode=span' })
  assert.equal(zh.statusCode, 200)
  assert.equal(ja.statusCode, 200)
  assert.match(zh.body, /SUMMARY:FX战士久留美/)
  assert.match(ja.body, /SUMMARY:Show 206401/)
  assert.match(zh.body, /我的追番（中文）/)
  assert.notEqual(zh.headers.etag, ja.headers.etag)
  assert.equal(seen.length, 2)
  assert.ok(seen.some(url => url.endsWith('/span.zh-CN.ics')))
  assert.ok(seen.some(url => url.endsWith('/span.ics')))
  assert.equal((await app.inject({url:'/api/calendar/v1/anime.ics?shows=206401&lang=fr'})).statusCode,400)
})
