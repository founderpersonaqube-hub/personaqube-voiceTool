export function generatePersonaInsights(personaFit, metrics) {
  const sorted = Object.entries(personaFit).sort(
    (a, b) => b[1] - a[1]
  )

  const primaryPersona = sorted[0]?.[0]
  if (!primaryPersona) return []

  return personaImprovements(primaryPersona, metrics)
}

function personaImprovements(persona, metrics) {
  const tips = []

  if (metrics.fillerRate > 0.05) {
    tips.push("Reduce filler words by using intentional pauses.")
  }

  switch (persona) {
    case "Leader":
      tips.push("Slow down slightly to project authority.")
      break
    case "Coach":
      tips.push("Maintain calm pacing while adding warmth.")
      break
    case "Trainer":
      tips.push("Segment ideas more clearly.")
      break
    case "Creator":
      tips.push("Balance enthusiasm with clarity.")
      break
  }

  return tips
}

