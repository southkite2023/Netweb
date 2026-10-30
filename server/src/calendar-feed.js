/**
 * Public, read-only multi-show ICS subscription endpoint.
 *
 * GitHub Pages publishes canonical AniList-derived ICS; the Fastify API merges
 * selected VEVENTs without changing UID, SEQUENCE, or DTSTART/DTEND. No database,
 * user account, user token, or outbound user-supplied URL is involved.
 */
import { createHash } from 'node:crypto'

const TRUSTED_UPSTREAM = 'https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime'
const MAX_SHOWS = 80
const MAX_QUERY_LENGTH = 1024
const MAX_UPSTREAM_BYTES = 2 * 1024 * 1024
const FRESH_MS = 5 * 60 * 1000
const STALE_MS = 6 * 60 * 60 * 1000

export function parseSelection(query) {
  if (!query || typeof query !== 'object' || Array.isArray(query)) return null
  if (Object.keys(query).some(key => !['shows', 'mode'].includes(key))) return null
  const raw = query.shows
  const mode = query.mode ?? 'span'
  if (typeof raw !== 'string' || !raw || raw.length > MAX_QUERY_LENGTH ||
      (mode !== 'span' && mode !== 'start')) return null
  const tokens = raw.split(',')
  if (tokens.length < 1 || tokens.length > MAX_SHOWS) return null
  const shows = new Set()
  for (const value of tokens) {
    if (!/^[1-9][0-9]{0,9}$/.test(value) || value.startsWith('0')) return null
    const id = Number(value)
    if (!Number.isSafeInteger(id) || id > 2147483647) return null
    shows.add(id)
  }
  if (shows.size < 1 || shows.size > MAX_SHOWS) return null
  return { shows: [...shows].sort((a, b) => a - b), mode }
}

function unfolding(lines) {
  const unfolded = []
  for (const line of lines) {
    if (/^[ \t]/.test(line) && unfolded.length) unfolded[unfolded.length - 1] += line.slice(1)
    else unfolded.push(line)
  }
  return unfolded
}

export function mergeAnimeCalendar(source, showIds) {
  if (typeof source !== 'string' || Buffer.byteLength(source, 'utf8') > MAX_UPSTREAM_BYTES) {
    throw new Error('Invalid or oversized upstream calendar')
  }
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  if (lines.at(-1) === '') lines.pop()
  if (lines[0] !== 'BEGIN:VCALENDAR' || lines.at(-1) !== 'END:VCALENDAR' ||
      !lines.includes('VERSION:2.0')) throw new Error('Invalid upstream calendar header')
  const targets = new Set(showIds)
  const selected = []
  let within = false
  let eventLines = []
  let total = 0
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      if (within) throw new Error('Nested VEVENT not allowed')
      within = true
      eventLines = [line]
      continue
    }
    if (line === 'END:VEVENT') {
      if (!within) throw new Error('Unexpected VEVENT terminator')
      eventLines.push(line)
      within = false
      total += 1
      if (total > 5000) throw new Error('Too many upstream events')
      const logical = unfolding(eventLines)
      const urls = logical.filter(s => s.startsWith('URL:'))
      const uids = logical.filter(s => s.startsWith('UID:'))
      if (urls.length !== 1 || uids.length !== 1 ||
          !/^UID:[0-9a-f-]+@calendar\.yuashie\.cn$/.test(uids[0])) {
        throw new Error('Untrusted or invalid upstream VEVENT')
      }
      const match = /^URL:https:\/\/anilist\.co\/anime\/([1-9][0-9]*)$/.exec(urls[0])
      if (!match) throw new Error('Unexpected upstream event source URL')
      if (targets.has(Number(match[1]))) selected.push(eventLines.join('\r\n'))
      eventLines = []
      continue
    }
    if (within) eventLines.push(line)
  }
  if (within || total === 0) throw new Error('Incomplete upstream calendar')
  const output = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Yuashie Calendar//Dynamic AniList Selection v1//ZH',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Yuashie Calendar · 我的追番',
    ...selected,
    'END:VCALENDAR',
    '',
  ].join('\r\n')
  return output
}

async function readBoundedResponse(response) {
  const claimed = Number(response.headers.get('content-length') || '0')
  if (claimed > MAX_UPSTREAM_BYTES) throw new Error('Upstream calendar too large')
  if (!response.body) throw new Error('Missing calendar response body')
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_UPSTREAM_BYTES) throw new Error('Upstream calendar too large')
      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks).toString('utf8')
}

export function registerCalendarFeed(app, {
  fetcher = globalThis.fetch,
  clock = () => Date.now(),
} = {}) {
  const cached = new Map()
  const pending = new Map()

  async function getCalendar(mode) {
    const previous = cached.get(mode)
    const now = clock()
    if (previous && now - previous.checked < FRESH_MS) return { content: previous.content, stale: false }

    if (!pending.has(mode)) {
      const job = (async () => {
        const url = `${TRUSTED_UPSTREAM}/${mode}.ics`
        const response = await fetcher(url, {
          method: 'GET',
          redirect: 'error',
          signal: AbortSignal.timeout(10000),
          headers: { 'Accept': 'text/calendar' },
        })
        if (!response.ok) throw new Error(`Upstream calendar HTTP ${response.status}`)
        const content = await readBoundedResponse(response)
        // Validate the entire source, not just whichever shows were selected.
        mergeAnimeCalendar(content, [])
        cached.set(mode, { content, checked: clock() })
        return content
      })()
      pending.set(mode, job)
      job.finally(() => pending.delete(mode)).catch(() => {})
    }
    try {
      return { content: await pending.get(mode), stale: false }
    } catch (error) {
      if (previous && now - previous.checked < STALE_MS) {
        app.log.warn({ message: error.message }, 'Serving retained AniList ICS after upstream error')
        return { content: previous.content, stale: true }
      }
      throw error
    }
  }

  app.get('/api/calendar/v1/health', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async () => ({ ok: true, service: 'anime-ics-selection', version: 1 }))

  app.get('/api/calendar/v1/anime.ics', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const selection = parseSelection(req.query)
      if (!selection) return reply.code(400).send({ message: 'Invalid shows/mode. Use 1–80 numeric AniList media IDs and mode=start|span.' })
      let source
      try {
        source = await getCalendar(selection.mode)
      } catch (error) {
        req.log.warn({ message: error.message }, 'Live anime ICS upstream unavailable')
        return reply.code(503).header('Retry-After', '300').send({ message: 'Calendar temporarily unavailable. Existing subscriptions remain valid.' })
      }
      let output
      try {
        output = mergeAnimeCalendar(source.content, selection.shows)
      } catch (error) {
        req.log.error({ message: error.message }, 'Failed to merge trusted source')
        return reply.code(503).header('Retry-After', '300').send({ message: 'Calendar temporarily unavailable.' })
      }
      const etag = '"' + createHash('sha256').update(output).digest('hex') + '"'
      reply.header('Content-Type', 'text/calendar; charset=utf-8')
      reply.header('Cache-Control', source.stale ? 'public, max-age=0, must-revalidate' : 'public, max-age=120, s-maxage=120')
      reply.header('ETag', etag)
      reply.header('X-Content-Type-Options', 'nosniff')
      if (req.headers['if-none-match'] === etag) return reply.code(304).send()
      return reply.send(output)
    })
}
