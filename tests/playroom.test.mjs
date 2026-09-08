import test from 'node:test'
import assert from 'node:assert/strict'
import { addTile, canMove, moveGame, newGame, restoreGame, slide } from '../src/lib/game2048.js'
import { playroomCopy } from '../src/data/playroom.js'

const board = row => [...row, ...Array(12).fill(0)]
test('2048 merges each tile once, in movement order, without mutating input', () => {
  const input = board([2, 2, 2, 2])
  assert.deepEqual(slide(input, 'left'), { board: board([4, 4, 0, 0]), gained: 8, moved: true })
  assert.deepEqual(slide(board([2, 2, 4, 0]), 'left').board, board([4, 4, 0, 0]))
  assert.deepEqual(slide(board([2, 2, 2, 0]), 'right').board, board([0, 0, 2, 4]))
  assert.deepEqual(input, board([2, 2, 2, 2]))
  const vertical = [2, 0, 0, 0, 2, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0]
  assert.deepEqual(slide(vertical, 'up').board, [4, 0, 0, 0, 8, 0, 0, 0, ...Array(8).fill(0)])
  assert.deepEqual(slide(vertical, 'down').board, [...Array(8).fill(0), 4, 0, 0, 0, 8, 0, 0, 0])
  assert.throws(() => slide(input, 'diagonal'), /Invalid direction/)
})
test('Only successful moves add a tile; loss detection checks all neighbors', () => {
  const state = { board: board([2, 4, 0, 0]), score: 0, celebrated: false }
  assert.strictEqual(moveGame(state, 'left'), state)
  const moved = moveGame(state, 'right', () => 0)
  assert.equal(moved.board.filter(Boolean).length, 3)
  const full = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]
  assert.equal(canMove(full), false)
  assert.equal(canMove(full.map((n, i) => i === 0 ? 4 : n)), true)
  assert.deepEqual(addTile(full), full)
  assert.equal(newGame(() => 0).board.filter(Boolean).length, 2)
  assert.ok(addTile(Array(16).fill(0), () => .99).includes(4))
})
test('Saved games reject corrupted or malicious browser state', () => {
  const game = newGame(() => 0)
  assert.deepEqual(restoreGame(JSON.stringify(game)), game)
  for (const raw of ['', 'null', '{}', '{', JSON.stringify({ ...game, score: -1 }), JSON.stringify({ ...game, score: '4' }), JSON.stringify({ ...game, board: Array(16).fill(3) }), JSON.stringify({ ...game, board: Array(16).fill(0) }), JSON.stringify({ ...game, board: Array(17).fill(2) })]) assert.equal(restoreGame(raw), null)
})
test('All playroom translations have matching nonempty copy', () => {
  const keys = Object.keys(playroomCopy.zh).sort()
  for (const language of ['en', 'ja']) assert.deepEqual(Object.keys(playroomCopy[language]).sort(), keys)
  for (const copy of Object.values(playroomCopy)) for (const value of Object.values(copy)) assert.ok(typeof value === 'string' && value.length)
})
