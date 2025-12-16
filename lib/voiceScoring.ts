export function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

export function computeConfidenceScore(metrics: {
  clarity: number
  pacing: number
  energy: number
  fillerRate: number
  hesitationRate?: number
}) {
  const {
    clarity,
    pacing,
    energy,
    fillerRate,
    hesitationRate = 0,
  } = metrics

  const rawScore =
    clarity * 35 +
    pacing * 20 +
    energy * 25 -
    fillerRate * 30 -
    hesitationRate * 10

  return clamp(Math.round(rawScore))
}
export function confidenceLabel(score: number) {
  if (score >= 85) return "Commanding"
  if (score >= 70) return "Strong"
  if (score >= 50) return "Moderate"
  return "Low"
}
export function computePersonaFit(metrics: {
  clarity: number
  pacing: number
  energy: number
  fillerRate: number
}) {
  const { clarity, pacing, energy, fillerRate } = metrics

  const leader =
    fillerRate > 0.12
      ? 0
      : clarity * 40 +
        pacing * 30 +
        (1 - fillerRate) * 30

  const trainer =
    clarity * 45 +
    pacing * 35 +
    (1 - Math.abs(pacing - 0.9)) * 20

  const coach =
    clarity * 35 +
    (1 - Math.abs(pacing - 0.8)) * 35 +
    (1 - fillerRate) * 30

  const creator =
    energy * 50 +
    clarity * 25 +
    pacing * 25

  return {
    Leader: clamp(Math.round(leader)),
    Trainer: clamp(Math.round(trainer)),
    Coach: clamp(Math.round(coach)),
    Creator: clamp(Math.round(creator)),
  }
}
export function getTopPersonas(personaFit: Record<string, number>) {
  const sorted = Object.entries(personaFit).sort(
    (a, b) => b[1] - a[1]
  )

  return {
    primary: sorted[0],
    secondary: sorted[1],
  }
}

