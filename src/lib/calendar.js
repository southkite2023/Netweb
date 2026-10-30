import { calendarGames, calendarTypes } from '../data/calendar.js'

// Deliberately unresolvable: never imply a live subscription before backend launch.
export const CALENDAR_TEST_ENDPOINT = 'https://calendar.example.invalid/v1/feed.ics'
// Live, public, read-only anime feeds. Keep separate from the unavailable
// custom multi-category URL builder and from the 2030 fictional test feeds.
export const CALENDAR_REAL_ANIME_FEEDS = Object.freeze({
  start: 'https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime/start.ics',
  duration: 'https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime/span.ics',
})
export const CALENDAR_REAL_ANIME_FEEDS_ZH = Object.freeze({
  start: 'https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime/start.zh-CN.ics',
  duration: 'https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime/span.zh-CN.ics',
})

export function defaultCalendarSelection() {
  return { games: Object.fromEntries(calendarGames.map(game => [game.id, game.id === 'genshin' ? [...calendarTypes] : []])), anime: false, releases: false, mode: 'start' }
}
export function calendarParams(selection) {
  const params = new URLSearchParams({ schema: '1', mode: selection.mode === 'duration' ? 'duration' : 'start', tz: 'Asia/Shanghai' })
  const categories = []
  for (const game of calendarGames) {
    const types = calendarTypes.filter(type => selection.games?.[game.id]?.includes(type))
    if (types.length) params.set(game.id, types.join(','))
  }
  if (calendarGames.some(game => params.has(game.id))) categories.push('games')
  if (selection.anime === true) categories.push('anime')
  if (selection.releases === true) categories.push('releases')
  if (!categories.length) return null
  params.set('categories', categories.join(','))
  params.set('test', '1')
  return params
}
export function calendarTestUrl(selection) {
  const params = calendarParams(selection)
  return params ? `${CALENDAR_TEST_ENDPOINT}?${params}` : null
}

// A static catalog, plus one durable HTTPS subscription per AniList show.
// GitHub Pages cannot host a dynamically merged per-user subscription URL.
export const CALENDAR_SEASON_CATALOG_URL = 'https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime/catalog/current-season.json'
export function animeShowFeedUrl(mediaId, mode = 'duration', lang = 'ja') {
  if (!Number.isSafeInteger(mediaId) || mediaId <= 0) return null
  const base = mode === 'start' ? 'start' : 'span'
  const filename = lang === 'zh-CN' ? `${base}.zh-CN.ics` : `${base}.ics`
  return `https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime/shows/${mediaId}/${filename}`
}

/**
 * One stable, server-generated ICS URL for any selected combination of shows.
 * Only display to users once /api/calendar/v1/health is live on their origin.
 */
export const CALENDAR_MERGE_HEALTH_URL = '/api/calendar/v1/health'
export function mergedAnimeFeedUrl(ids, mode = 'duration', lang = 'ja') {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 80) return null
  if (!ids.every(id => Number.isSafeInteger(id) && id > 0 && id <= 2147483647)) return null
  if (!['ja', 'zh-CN'].includes(lang)) return null
  const list = [...new Set(ids)].sort((a,b)=>a-b)
  if (!list.length) return null
  const params = new URLSearchParams({
    shows: list.join(','),
    mode: mode === 'start' ? 'start' : 'span',
    ...(lang === 'zh-CN' ? { lang: 'zh-CN' } : {}),
  })
  return `https://yuashie.cn/api/calendar/v1/anime.ics?${params.toString()}`
}
