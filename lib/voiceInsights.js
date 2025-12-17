// lib/voiceInsights.js

export function personaExplanation(persona, m) {
  switch (persona) {
    case "Leader":
      return "Your clarity and presence support leadership communication. Reducing fillers and maintaining firm pacing will strengthen authority."
    case "Coach":
      return "Your calm pacing and clarity make people feel heard and supported. This suits coaching and mentoring roles."
    case "Trainer":
      return "Your structured delivery helps explain ideas clearly, which is ideal for teaching and instruction."
    case "Creator":
      return "Your energy and expressiveness help capture attention, making this style effective for creative communication."
    default:
      return ""
  }
}

export function personaBlockers(persona, m) {
  const blockers = []

  if (persona === "Leader") {
    if (m.fillerRate > 0.08) blockers.push("Frequent filler words weaken authority.")
    if (m.pacing < 0.5) blockers.push("Pacing is too slow for decisive leadership.")
  }

  if (persona === "Coach") {
    if (m.energy < 0.5) blockers.push("Low energy may reduce engagement.")
  }

  if (persona === "Trainer") {
    if (m.clarity < 0.7) blockers.push("Improving articulation will help learners.")
  }

  if (persona === "Creator") {
    if (m.clarity < 0.6) blockers.push("High energy needs clearer articulation.")
  }

  return blockers
}

export function generatePersonaInsights(persona) {
  switch (persona) {
    case "Leader":
      return [
        "Replace filler words with short pauses.",
        "Slow down slightly on key decisions.",
      ]
    case "Coach":
      return [
        "Maintain calm pacing with gentle vocal warmth.",
        "Use pauses to let ideas land.",
      ]
    case "Trainer":
      return [
        "Break long sentences into clear segments.",
        "Keep a steady, predictable pace.",
      ]
    case "Creator":
      return [
        "Balance enthusiasm with clarity.",
        "Use pitch variation intentionally.",
      ]
    default:
      return []
  }
}

