// pages/api/transcribe.js

import OpenAI from "openai"
import { computeConfidence, computePersonaFit } from "../../lib/voiceScoring"

export const config = {
  api: { bodyParser: false },
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const buffers = []
    for await (const chunk of req) {
      buffers.push(chunk)
    }

    const audioBuffer = Buffer.concat(buffers)

    // 🔹 TRANSCRIPTION (mock-safe placeholder)
    // Replace later with Whisper streaming if needed
    const transcript =
      "Hi everyone, this is Ravi here. I am excited to record my voice."

    // 🔹 BASIC METRICS (Phase 2.1 logic)
    const metrics = {
      clarity: 0.9,
      pacing: 0.85,
      energy: 0.8,
      fillerRate: 0.15,
    }

    const confidenceScore = computeConfidence(metrics)
    const personaFit = computePersonaFit(metrics)

    return res.status(200).json({
      transcript,
      metrics,
      confidenceScore,
      personaFit,
    })
  } catch (err) {
    console.error("API Error:", err)
    return res.status(500).json({ error: "Analysis failed" })
  }
}

