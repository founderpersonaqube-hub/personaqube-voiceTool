type Metrics = {
  clarity: number
  pacing: number
  energy: number
  fillerRate: number
  fillerCount: number
  wordCount: number
}

export function confidenceExplanation(score: number): string {
  if (score >= 85) {
    return "You sound confident, composed, and in control. Your voice projects assurance and leadership."
  }
  if (score >= 70) {
    return "You sound fairly confident, though there are moments of hesitation or inconsistency."
  }
  if (score >= 50) {
    return "Your confidence fluctuates. The message is clear, but delivery weakens your impact."
  }
  return "Your voice reflects nervousness or uncertainty. Confidence improvement will significantly boost your presence."
}

export function personaExplanation(persona: string): string {
  const map: Record<string, string> = {
    Leader:
      "Your voice is steady, controlled, and assertive — qualities associated with leadership presence.",
    Trainer:
      "Your voice is clear and structured, making it suitable for teaching and guiding others.",
    Coach:
      "Your tone carries empathy and encouragement, helping people feel supported.",
    Creator:
      "Your voice has expressive variation, suitable for storytelling and creative communication.",
  }

  return map[persona] || "Your voice shows a balanced communication style."
}

export function improvementTips(metrics: Metrics): string[] {
  const tips: string[] = []

  if (metrics.fillerRate > 0.04) {
    tips.push("Reduce filler words by pausing briefly instead of filling silence.")
  }

  if (metrics.pacing < 0.6) {
    tips.push("Increase pacing slightly to sound more confident and engaging.")
  }

  if (metrics.energy < 0.6) {
    tips.push("Add vocal energy by varying pitch and emphasizing key words.")
  }

  if (metrics.clarity < 0.6) {
    tips.push("Improve articulation by slowing down on complex phrases.")
  }

  if (tips.length === 0) {
    tips.push("Your delivery is strong. Focus on consistency to maintain this level.")
  }

  return tips
}

