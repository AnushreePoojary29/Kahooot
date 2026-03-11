export function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function calculateScore(isCorrect, responseTimeMs, timeLimitMs) {
  if (!isCorrect) return 0
  const BASE_SCORE = 1000
  const ratio = Math.max(0, 1 - responseTimeMs / timeLimitMs)
  const speedBonus = Math.round(ratio * 500)
  return BASE_SCORE + speedBonus
}
