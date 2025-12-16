// lib/voiceScoring.ts

export function computeConfidence(metrics: {
  clarity: number
  pacing: number
  energy: number
  fillerRate: number
}) {
  const raw =
    metrics.clarity * 0.35 +
    metrics.pacing * 0.25 +
    metrics.energy * 0.25 -
    metrics.fillerRate * 0.6

  return Math.max(0, Math.min(100, Math.round(raw * 100)))
}

export function computePersonaFit(metrics: {
  clarity: number
  pacing: number
  energy: number
  fillerRate: number
}) {
  return {
    Leader: Math.round(
      metrics.clarity * 40 +
      metrics.energy * 40 -
      metrics.fillerRate * 30
    ),
    Trainer: Math.round(
      metrics.pacing * 40 +
      metrics.clarity * 30
    ),
    Coach: Math.round(
      metrics.pacing * 40 +
      (1 - metrics.fillerRate) * 40
    ),
    Creator: Math.round(
      metrics.energy * 50 +
      metrics.clarity * 20
    ),
  }
}

