// lib/metrics.js

const FILLER_WORDS = [
  "um",
  "uh",
  "you know",
  "like",
  "actually",
  "basically",
  "so",
]

export function extractMetrics(transcript = "") {
  const text = transcript.toLowerCase()

  const words = text.split(/\s+/).filter(Boolean)
  const wordCount = words.length

  let fillerCount = 0
  FILLER_WORDS.forEach((filler) => {
    const matches = text.match(new RegExp(`\\b${filler}\\b`, "g"))
    if (matches) fillerCount += matches.length
  })

  const fillerRate = wordCount > 0 ? fillerCount / wordCount : 0

  // Heuristic-based voice metrics (MVP version)
  const clarity = Math.max(0.5, 1 - fillerRate * 1.2)
  const pacing = Math.min(1, Math.max(0.6, wordCount / 120))
  const energy = Math.min(1, Math.max(0.6, wordCount / 100))

  return {
    clarity,
    pacing,
    energy,
    fillerRate,
    wordCount,
  }
}

