export function generatePersonaInsights(personaFit, metrics) {
  const sorted = Object.entries(personaFit).sort(
    (a, b) => b[1] - a[1]
  )

  const primaryPersona = sorted[0]?.[0]
  if (!primaryPersona) return []

  const insights = []

  if (metrics.fillerRate > 0.05) {
    insights.push("Reduce filler words by using intentional pauses.")
  }

  switch (primaryPersona) {
    case "Leader":
      insights.push("Slow down slightly to project authority.")
      break
    case "Coach":
      insights.push("Maintain calm pacing while adding warmth.")
      break
    case "Trainer":
      insights.push("Segment ideas more clearly.")
      break
    case "Creator":
      insights.push("Balance enthusiasm with clarity.")
      break
  }

  return insights
}

