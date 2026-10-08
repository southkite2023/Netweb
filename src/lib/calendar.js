import { calendarGames, calendarTypes } from '../data/calendar.js'

// Deliberately unresolvable: never imply a live subscription before backend launch.
export const CALENDAR_TEST_ENDPOINT = 'https://calendar.example.invalid/v1/feed.ics'
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
