export function extractMetrics(transcript = "") {
  const words = transcript.toLowerCase().split(/\s+/)

  const fillerWords = ["um", "uh", "you know", "like", "actually", "basically"]
  let fillerCount = 0

  for (const word of words) {
    if (fillerWords.includes(word)) fillerCount++
  }

  const fillerRate = words.length
    ? fillerCount / words.length
    : 0

  return {
    clarity: 0.9,
    pacing: 0.85,
    energy: 0.8,
    fillerRate,
  }
}

