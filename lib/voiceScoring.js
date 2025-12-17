export function computeOverallConfidence(metrics) {
  const { clarity, pacing, energy, fillerRate } = metrics

  let fillerPenalty = 0
  if (fillerRate > 0.15) {
    fillerPenalty = fillerRate * 140
  } else if (fillerRate > 0.05) {
    fillerPenalty = fillerRate * 90
  } else {
    fillerPenalty = fillerRate * 40
  }

  let score =
    clarity * 40 +
    pacing * 30 +
    energy * 30 -
    fillerPenalty

  score = Math.max(0, Math.min(100, Math.round(score)))

  const personaFit = {
    Leader: Math.max(0, score - fillerRate * 100),
    Coach: Math.min(100, score + 5),
    Trainer: Math.min(100, score - 5),
    Creator: Math.max(0, score - 10),
  }

  return {
    confidenceScore: score,
    personaFit,
  }
}

