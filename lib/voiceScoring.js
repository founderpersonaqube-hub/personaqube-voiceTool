export function computeOverallConfidence(metrics) {
  const {
    fillerRate,
    avgSentenceLength,
    lexicalDiversity,
    fragmentRate,
    wordsPerMinute,
  } = metrics

  let score = 70

  // ✅ Positive signals
  if (lexicalDiversity > 0.55) score += 6
  if (lexicalDiversity > 0.65) score += 4

  if (avgSentenceLength >= 8 && avgSentenceLength <= 18) {
    score += 6
  }

  // Speaking pace bonus (140-180 WPM is ideal)
  if (wordsPerMinute && wordsPerMinute >= 140 && wordsPerMinute <= 180) {
    score += 5
  }

  // ❌ Strong penalties
  score -= Math.min(30, fillerRate * 220)
  score -= fragmentRate * 40

  // ❌ Rambling or robotic speech
  if (avgSentenceLength > 25) score -= 8
  if (avgSentenceLength < 6) score -= 6

  // Pace penalties
  if (wordsPerMinute) {
    if (wordsPerMinute < 120) score -= 8 // Too slow
    if (wordsPerMinute > 200) score -= 10 // Too fast
  }

  // 🚫 Hard caps
  if (fillerRate > 0.04) score = Math.min(score, 82)
  if (fragmentRate > 0.2) score = Math.min(score, 78)

  score = Math.round(Math.max(0, Math.min(100, score)))

  const personaFit = {
    Leader: score * 0.92,
    Coach: score * 1.04,
    Trainer: score * 0.95,
    Creator: score * 0.9,
  }

  return { confidenceScore: score, personaFit }
}

