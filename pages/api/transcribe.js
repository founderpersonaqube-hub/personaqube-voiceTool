import OpenAI from "openai"
import { calculateConfidenceAndPersona } from "../../lib/voiceScoring.js"

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
}

export const config = {
  api: {
    bodyParser: false,
  },
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function extractMetrics(transcript) {
  const words = transcript.toLowerCase().split(/\s+/)

  const fillers = [
    "uh",
    "um",
    "like",
    "you know",
    "actually",
    "basically",
    "so",
  ]

  let fillerCount = 0
  words.forEach(w => {
    if (fillers.includes(w)) fillerCount++
  })

  const fillerRate = fillerCount / Math.max(1, words.length)

  return {
    clarity: Math.max(0.4, 1 - fillerRate * 1.6),
    pacing: 0.75,
    energy: 0.8,
    fillerRate,
  }
}

export default async function handler(req, res) {
  setCors(res)

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false })
  }

  try {
    // ✅ THIS IS THE KEY LINE
    const formData = await req.formData()
    const audioFile = formData.get("file")

    if (!audioFile) {
      return res.status(400).json({
        ok: false,
        error: "Audio file not found",
      })
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
    })

    const transcript = transcription.text || ""
    const metrics = extractMetrics(transcript)

    const { confidenceScore, personaFit } =
      calculateConfidenceAndPersona(metrics)

    return res.status(200).json({
      ok: true,
      transcript,
      metrics,
      confidenceScore,
      personaFit,
    })
  } catch (err) {
    console.error("TRANSCRIBE ERROR:", err)
    return res.status(500).json({
      ok: false,
      error: err.message || "Transcription failed",
    })
  }
}

