// lib/voiceScoring.js

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

function invert(n) {
  return 1 - n
}

// ------------------------
// Overall confidence
// ------------------------
export function computeOverallConfidence(m) {
  const score =
    m.clarity * 35 +
    m.energy * 25 +
    m.pacing * 20 -
    m.fillerRate * 40

  return clamp(Math.round(score))
}

// ------------------------
// Persona fit
// ------------------------
export function computePersonaFit(m) {
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
// Persona ranking
// ------------------------
export function rankPersonas(personaFit) {
  const sorted = Object.entries(personaFit).sort((a, b) => b[1] - a[1])

  return {
    primary: sorted[0],
    secondary: sorted[1],
    all: sorted,
  }
}

