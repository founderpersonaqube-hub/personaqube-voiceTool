// lib/voiceInsights.ts

import { VoiceMetrics } from "./voiceScoring"

type Persona = "Leader" | "Coach" | "Trainer" | "Creator"

export function personaExplanation(
  persona: Persona,
  m: VoiceMetrics
): string {
  switch (persona) {
    case "Leader":
      return "Your voice shows clarity and presence, which are essential for leadership. When your delivery is controlled and filler-free, you project authority and decisiveness."
    case "Coach":
      return "Your calm pacing and clear articulation make people feel heard and supported. This is ideal for coaching and one-on-one communication."
    case "Trainer":
      return "Your clarity and structured pacing help audiences understand complex ideas. This is well suited for teaching and instructional roles."
    case "Creator":
      return "Your vocal energy and expressiveness help capture attention. This style works well for storytelling, content creation, and creative communication."
  }
}

export function personaBlockers(
  persona: Persona,
  m: VoiceMetrics
): string[] {
  const blockers: string[] = []

  if (persona === "Leader") {
    if (m.fillerRate > 0.08) {
      blockers.push("Frequent filler words reduce perceived authority.")
    }
    if (m.pacing < 0.5) {
      blockers.push("Pacing is slightly slow for leadership presence.")
    }
  }

  if (persona === "Coach") {
    if (m.energy < 0.5) {
      blockers.push("Low vocal energy may make you sound disengaged.")
    }
  }

  if (persona === "Trainer") {
    if (m.clarity < 0.7) {
      blockers.push("Improving articulation will make explanations clearer.")
    }
  }

  if (persona === "Creator") {
    if (m.clarity < 0.6) {
      blockers.push("High energy needs clearer articulation to stay impactful.")
    }
  }

  return blockers
}

export function personaImprovements(
  persona: Persona,
  m: VoiceMetrics
): string[] {
  const tips: string[] = []

  switch (persona) {
    case "Leader":
      tips.push("Replace filler words with short, intentional pauses.")
      tips.push("Emphasize key phrases by slightly slowing your delivery.")
      break

    case "Coach":
      tips.push("Maintain your calm pacing while adding subtle vocal warmth.")
      tips.push("Use pauses to allow important points to land.")
      break

    case "Trainer":
      tips.push("Break long sentences into shorter, well-articulated phrases.")
      tips.push("Use consistent pacing to help listeners follow along.")
      break

    case "Creator":
      tips.push("Balance energy with clarity to keep attention without confusion.")
      tips.push("Vary pitch intentionally to highlight key moments.")
      break
  }

  return tips
}

