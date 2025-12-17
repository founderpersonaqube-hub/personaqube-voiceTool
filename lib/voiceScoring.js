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

  let rawScore =
    clarity * 30 +
    pacing * 30 +
    energy * 30 -
    fillerPenalty

  rawScore = Math.max(20, Math.min(100, rawScore))

  const personaFit = {
    Leader: rawScore * 0.95,
    Coach: rawScore * 1.05,
    Trainer: rawScore * 0.92,
    Creator: rawScore * 0.88,
  }

  return {
    confidenceScore: Math.round(rawScore),
    personaFit,
  }
}

