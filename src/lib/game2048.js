// A functional adaptation of Gabriele Cirulli's 2048 (MIT).
// Attribution and original license: /assets/licenses/2048.txt.
export const DIRECTIONS = ['up', 'right', 'down', 'left']
export function slide(board, direction) {
  if (!DIRECTIONS.includes(direction)) throw new Error('Invalid direction')
  const next = [...board]
  let gained = 0
  for (let line = 0; line < 4; line++) {
    const indices = Array.from({ length: 4 }, (_, offset) => {
      if (direction === 'left') return line * 4 + offset
      if (direction === 'right') return line * 4 + 3 - offset
      if (direction === 'up') return offset * 4 + line
      return (3 - offset) * 4 + line
    })
    const numbers = indices.map(index => board[index]).filter(Boolean)
    const merged = []
    for (let i = 0; i < numbers.length; i++) {
      if (numbers[i] === numbers[i + 1]) {
        const value = numbers[i] * 2
        merged.push(value)
        gained += value
        i++ // A newly merged tile cannot merge again in the same move.
      } else merged.push(numbers[i])
    }
    indices.forEach((index, offset) => { next[index] = merged[offset] || 0 })
  }
  return { board: next, gained, moved: next.some((n, i) => n !== board[i]) }
}
export function addTile(board, random = Math.random) {
  const empty = board.flatMap((n, i) => n ? [] : [i])
  if (!empty.length) return [...board]
  const next = [...board]
  const index = empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))]
  next[index] = random() < .9 ? 2 : 4
  return next
}
export function newGame(random = Math.random) {
  return { board: addTile(addTile(Array(16).fill(0), random), random), score: 0, celebrated: false }
}
export function canMove(board) {
  return board.includes(0) || DIRECTIONS.some(direction => slide(board, direction).moved)
}
export function moveGame(game, direction, random = Math.random) {
  const result = slide(game.board, direction)
  if (!result.moved) return game
  return { ...game, board: addTile(result.board, random), score: game.score + result.gained }
}
export function restoreGame(raw) {
  try {
    const value = JSON.parse(raw)
    if (!Array.isArray(value?.board) || value.board.length !== 16) return null
    if (!value.board.every(n => Number.isSafeInteger(n) && (n === 0 || (n >= 2 && n <= 131072 && Number.isInteger(Math.log2(n)))))) return null
    if (value.board.filter(Boolean).length < 2 || !Number.isSafeInteger(value.score) || value.score < 0 || value.score > 1e9) return null
    return { board: [...value.board], score: value.score, celebrated: value.celebrated === true }
  } catch { return null }
}
