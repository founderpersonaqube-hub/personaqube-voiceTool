// lib/voiceScoring.js

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function invert(n) {
  return 1 - n
}

/* --------------------------------------------------
   FILLER PENALTY (STRONG & PROGRESSIVE)
-------------------------------------------------- */
function computeFillerPenalty(fillerRate) {
  let fillerPenalty = 0

  if (fillerRate > 0.15) {
    fillerPenalty = fillerRate * 140
  } else if (fillerRate > 0.05) {
    fillerPenalty = fillerRate * 90
  } else {
    fillerPenalty = fillerRate * 40
  }

  return fillerPenalty
}

/* --------------------------------------------------
   OVERALL CONFIDENCE SCORE
-------------------------------------------------- */
export function computeOverallConfidence(m) {
  const fillerPenalty = computeFillerPenalty(m.fillerRate)

  const rawScore =
    m.clarity * 38 +
    m.energy * 28 +
    m.pacing * 24 -
    fillerPenalty

  return clamp(rawScore)
}

/* --------------------------------------------------
   PERSONA FIT SCORING
-------------------------------------------------- */
export function computePersonaFit(m) {
  const fillerPenalty = computeFillerPenalty(m.fillerRate)

  const leader =
    m.clarity * 42 +
    m.energy * 32 +
    invert(Math.abs(m.pacing - 0.6)) * 26 -
    fillerPenalty * 0.6

  const coach =
    m.clarity * 38 +
    invert(m.fillerRate) * 38 +
    invert(Math.abs(m.pacing - 0.45)) * 28 -
    fillerPenalty * 0.4

  const trainer =
    m.clarity * 46 +
    invert(m.fillerRate) * 32 +
    invert(Math.abs(m.pacing - 0.55)) * 22 -
    fillerPenalty * 0.5

  const creator =
    m.energy * 48 +
    m.clarity * 26 +
    invert(Math.abs(m.pacing - 0.7)) * 26 -
    fillerPenalty * 0.3

  return {
    Leader: clamp(leader),
    Coach: clamp(coach),
    Trainer: clamp(trainer),
    Creator: clamp(creator),
  }
}

/* --------------------------------------------------
   PERSONA RANKING
-------------------------------------------------- */
export function rankPersonas(personaFit) {
  const sorted = Object.entries(personaFit).sort((a, b) => b[1] - a[1])

  return {
    primary: sorted[0],
    secondary: sorted[1],
    all: sorted,
  }
}

