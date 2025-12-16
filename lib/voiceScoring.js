// lib/voiceScoring.js

export function calculateConfidenceAndPersona(metrics) {
  const { clarity, pacing, energy, fillerRate } = metrics

  // -------------------------------
  // FILLER PENALTY (STRONG + NON-LINEAR)
  // -------------------------------
  let fillerPenalty = 0

  if (fillerRate > 0.15) {
    fillerPenalty = fillerRate * 140
  } else if (fillerRate > 0.05) {
    fillerPenalty = fillerRate * 90
  } else {
    fillerPenalty = fillerRate * 40
  }

  // -------------------------------
  // CONFIDENCE SCORE
  // -------------------------------
  let confidenceScore =
    clarity * 40 +
    pacing * 30 +
    energy * 30 -
    fillerPenalty

  confidenceScore = Math.round(
    Math.max(20, Math.min(95, confidenceScore))
  )

  // -------------------------------
  // PERSONA FIT
  // -------------------------------
  const personaFit = {
    Leader: Math.max(
      0,
      clarity * 40 + energy * 35 - fillerPenalty * 0.3
    ),
    Coach: Math.max(
      0,
      clarity * 45 + pacing * 35 - fillerPenalty * 0.2
    ),
    Trainer: Math.max(
      0,
      clarity * 35 + pacing * 40 - fillerPenalty * 0.25
    ),
    Creator: Math.max(
      0,
      energy * 45 + pacing * 30 - fillerPenalty * 0.15
    ),
  }

  return { confidenceScore, personaFit }
}

