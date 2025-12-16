// lib/voiceScoring.ts

export type VoiceMetrics = {
  clarity: number        // 0–1
  pacing: number         // 0–1 (0 = slow, 1 = fast)
  energy: number         // 0–1
  fillerRate: number     // 0–1
}

// ------------------------
// Utilities
// ------------------------
function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

function invert(n: number) {
  return 1 - n
}

// ------------------------
// Global Confidence Score
// (persona-agnostic)
// ------------------------
export function computeOverallConfidence(m: VoiceMetrics): number {
  const score =
    m.clarity * 35 +
    m.energy * 25 +
    m.pacing * 20 -
    m.fillerRate * 40

  return clamp(Math.round(score))
}

// ------------------------
// Persona-Aware Scoring
// ------------------------
export function computePersonaFit(m: VoiceMetrics) {
  const leader =
    m.clarity * 40 +
    m.energy * 30 +
    invert(m.fillerRate) * 30 -
    Math.abs(m.pacing - 0.6) * 20

  const coach =
    m.clarity * 35 +
    invert(m.fillerRate) * 35 +
    invert(Math.abs(m.pacing - 0.45)) * 30

  const trainer =
    m.clarity * 45 +
    invert(m.fillerRate) * 30 +
    invert(Math.abs(m.pacing - 0.55)) * 25

  const creator =
    m.energy * 45 +
    m.clarity * 25 +
    invert(Math.abs(m.pacing - 0.7)) * 30

  return {
    Leader: clamp(Math.round(leader)),
    Coach: clamp(Math.round(coach)),
    Trainer: clamp(Math.round(trainer)),
    Creator: clamp(Math.round(creator)),
  }
}

// ------------------------
// Persona Ranking
// ------------------------
export function rankPersonas(personaFit: Record<string, number>) {
  const sorted = Object.entries(personaFit).sort((a, b) => b[1] - a[1])

  return {
    primary: sorted[0],
    secondary: sorted[1],
    all: sorted,
  }
}

