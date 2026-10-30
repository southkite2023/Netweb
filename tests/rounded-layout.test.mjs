import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const styles = readFileSync(new URL('../src/rounded-ui.css', import.meta.url), 'utf8')
const calendar = readFileSync(new URL('../src/calendar.css', import.meta.url), 'utf8')
const entry = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')

test('shared radius stylesheet is imported after all general UI styles', () => {
  const general = entry.indexOf("import './interaction-motion.css'")
  const rounded = entry.indexOf("import './rounded-ui.css'")
  assert.ok(general >= 0 && rounded > general)
  for (const token of ['--radius-control', '--radius-card', '--radius-panel']) {
    assert.ok(styles.includes(token), `Missing radius token ${token}`)
  }
  for (const surface of ['.card', '.terminal', '.profile-hero', '.radio-table-wrap',
    '.calendar-season-picker', '.privacy-banner']) {
    assert.ok(styles.includes(surface), `Missing rounded surface ${surface}`)
  }
  assert.ok(styles.includes('input:not([type="checkbox"]):not([type="radio"])'))
  assert.ok(styles.includes('border-radius: 50%'), 'Circular avatars must remain circular')
  assert.ok(!/\*\s*\{\s*border-radius\s*:/.test(styles), 'Do not round all descendants indiscriminately')
})

test('seasonal anime picker uses five desktop columns, compact cards and responsive breakpoints', () => {
  const section = calendar.split('/* Five anime cards per desktop row;')[1]
  assert.ok(section, 'Missing five-column seasonal grid rules')
  assert.match(section, /\.calendar-season-picker \.calendar-season-list\s*\{[^}]*repeat\(5,\s*minmax\(0,\s*1fr\)\)/s)
  for (const [width, count] of [[1180,4],[960,3],[720,2]]) {
    const match = new RegExp(`@media \\(max-width: ${width}px\\) \\{[^}]*\\.calendar-season-picker \\.calendar-season-list \\{[^}]*repeat\\(${count},`, 's')
    assert.match(section, match, `Missing ${count}-column breakpoint at ${width}px`)
  }
  assert.match(section, /@media \(max-width: 440px\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)/)
  assert.match(section, /border-radius: var\(--radius-control, 12px\)/)
  assert.match(section, /-webkit-line-clamp: 2/)
})
