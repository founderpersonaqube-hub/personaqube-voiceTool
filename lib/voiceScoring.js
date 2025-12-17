export function computeOverallConfidence(metrics) {
  const { clarity, pacing, energy, fillerRate } = metrics

  let baseScore =
    clarity * 35 +
    pacing * 30 +
    energy * 25

  let fillerPenalty = 0

  if (fillerRate > 0.15) {
    fillerPenalty = fillerRate * 140
  } else if (fillerRate > 0.05) {
    fillerPenalty = fillerRate * 90
  } else {
    fillerPenalty = fillerRate * 40
  }

  let confidenceScore = Math.round(
    Math.max(0, Math.min(100, baseScore - fillerPenalty))
  )

  const personaFit = {
    Leader: confidenceScore * 0.95,
    Coach: confidenceScore * 1.05,
    Trainer: confidenceScore * 0.92,
    Creator: confidenceScore * 0.88,
  }

  return {
    confidenceScore,
    personaFit,
  }
}

