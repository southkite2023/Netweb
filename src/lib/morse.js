export const MORSE = Object.freeze({
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
})

export function encodeMorse(text) {
  const normalized = String(text).normalize('NFKC').toUpperCase().trim()
  const unsupported = [...new Set([...normalized].filter(char => !/\s/.test(char) && !MORSE[char]))]
  const code = normalized.split(/\s+/).filter(Boolean).map(word => [...word].map(char => MORSE[char] || '�').join(' ')).join(' / ')
  return { code, unsupported }
}

// PARIS timing: dot=1, dash=3, intra-character=1, character gap=3, word gap=7.
export function morseTimeline(code, wpm = 18) {
  const unit = 1.2 / Math.min(30, Math.max(5, Number(wpm) || 18))
  const tones = []
  let cursor = 0
  const words = code.trim().split(/\s*\/\s*/).filter(Boolean)
  words.forEach((word, wordIndex) => {
    const letters = word.split(/\s+/).filter(Boolean)
    letters.forEach((letter, letterIndex) => {
      ;[...letter].forEach((symbol, symbolIndex) => {
        if (symbol !== '.' && symbol !== '-') throw new Error('Invalid Morse symbol')
        const duration = (symbol === '.' ? 1 : 3) * unit
        tones.push({ start: cursor, duration })
        cursor += duration + (symbolIndex < letter.length - 1 ? unit : 0)
      })
      if (letterIndex < letters.length - 1) cursor += 3 * unit
    })
    if (wordIndex < words.length - 1) cursor += 7 * unit
  })
  return { tones, duration: cursor }
}
