export function generatePersonaInsights(personaFit, metrics) {
  if (!personaFit || typeof personaFit !== "object") return []

  const sorted = Object.entries(personaFit).sort(
    (a, b) => b[1] - a[1]
  )

  const primaryPersona = sorted[0]?.[0]
  if (!primaryPersona) return []

  const insights = []

  if (metrics.fillerRate > 0.05) {
    insights.push("Reduce filler words by using intentional pauses.")
  }

  if (metrics.wordsPerMinute) {
    if (metrics.wordsPerMinute < 120) {
      insights.push("Increase speaking pace for better engagement.")
    } else if (metrics.wordsPerMinute > 200) {
      insights.push("Slow down to improve clarity and comprehension.")
    }
  }

  if (metrics.fragmentRate > 0.15) {
    insights.push("Complete your thoughts before moving to new ideas.")
  }

  switch (primaryPersona) {
    case "Leader":
      insights.push("Use deliberate pauses to emphasize key points.")
      break
    case "Coach":
      insights.push("Vary your tone to maintain listener engagement.")
      break
    case "Trainer":
      insights.push("Structure content with clear transitions.")
      break
    case "Creator":
      insights.push("Channel enthusiasm while maintaining clarity.")
      break
  }

  return insights
}

