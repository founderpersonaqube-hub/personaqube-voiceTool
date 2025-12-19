export function computeOverallConfidence(metrics) {
  const {
    fillerRate,
    avgSentenceLength,
    lexicalDiversity,
    fragmentRate,
  } = metrics

  let score = 70

  // ✅ Positive signals
  if (lexicalDiversity > 0.55) score += 6
  if (lexicalDiversity > 0.65) score += 4

  if (avgSentenceLength >= 8 && avgSentenceLength <= 18) {
    score += 6
  }

  // ❌ Strong penalties
  score -= Math.min(30, fillerRate * 220)
  score -= fragmentRate * 40

  // ❌ Rambling or robotic speech
  if (avgSentenceLength > 25) score -= 8
  if (avgSentenceLength < 6) score -= 6

  // 🚫 Hard caps (this enforces rarity of 90+)
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

