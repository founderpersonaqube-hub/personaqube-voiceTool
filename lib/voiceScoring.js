// lib/voiceScoring.js

export function calculateConfidenceAndPersona(metrics) {
  const {
    clarity = 0,
    pacing = 0,
    energy = 0,
    fillerRate = 0,
  } = metrics

  /* -------------------------------
     FILLER PENALTY (STRONG)
  -------------------------------- */

  let fillerPenalty = 0

  if (fillerRate > 0.2) {
    fillerPenalty = fillerRate * 180
  } else if (fillerRate > 0.1) {
    fillerPenalty = fillerRate * 130
  } else if (fillerRate > 0.05) {
    fillerPenalty = fillerRate * 80
  } else {
    fillerPenalty = fillerRate * 40
  }

  /* -------------------------------
     BASE CONFIDENCE SCORE
  -------------------------------- */

  let rawScore =
    clarity * 40 +
    pacing * 30 +
    energy * 30 -
    fillerPenalty

  // LOWER FLOOR — important
  rawScore = Math.round(rawScore)

  const confidenceScore = Math.max(20, Math.min(100, rawScore))

  /* -------------------------------
     PERSONA FIT (WEIGHTED)
  -------------------------------- */

  const personaFit = {
    Leader:
      clarity * 45 +
      pacing * 35 +
      energy * 20 -
      fillerPenalty * 0.3,

    Coach:
      clarity * 40 +
      energy * 40 +
      pacing * 20 -
      fillerPenalty * 0.2,

    Trainer:
      clarity * 50 +
      pacing * 30 +
      energy * 20 -
      fillerPenalty * 0.25,

    Creator:
      energy * 50 +
      clarity * 30 +
      pacing * 20 -
      fillerPenalty * 0.15,
  }

  // Normalize persona scores
  Object.keys(personaFit).forEach((key) => {
    personaFit[key] = Math.max(0, Math.round(personaFit[key]))
  })

  return {
    confidenceScore,
    personaFit,
  }
}

