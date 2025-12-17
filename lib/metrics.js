export function extractMetrics(transcript) {
  const words = transcript.trim().split(/\s+/)
  const wordCount = words.length

  const fillerWords = [
    "um",
    "uh",
    "like",
    "you know",
    "so",
    "actually",
  ]

  let fillerCount = 0
  fillerWords.forEach((filler) => {
    const regex = new RegExp(`\\b${filler}\\b`, "gi")
    fillerCount += (transcript.match(regex) || []).length
  })

  const fillerRate =
    wordCount > 0 ? fillerCount / wordCount : 0

  return {
    wordCount,
    fillerCount,
    fillerRate,
    clarity: 0.9,
    pacing: 0.85,
    energy: 0.8,
  }
}

