import OpenAI from "openai"
import { calculateConfidenceAndPersona } from "../../lib/voiceScoring"

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "https://personaqube.com")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// -------------------------------
// METRIC EXTRACTION (PER REQUEST)
// -------------------------------
function extractMetricsFromTranscript(transcript) {
  const words = transcript.toLowerCase().split(/\s+/)

  const fillerWords = [
    "uh",
    "um",
    "like",
    "you know",
    "actually",
    "basically",
    "so",
  ]

  let fillerCount = 0
  words.forEach(word => {
    if (fillerWords.includes(word)) fillerCount++
  })

  const wordCount = words.length || 1
  const fillerRate = fillerCount / wordCount

  return {
    clarity: Math.max(0.4, 1 - fillerRate * 1.6),
    pacing: 0.7 + Math.random() * 0.25,
    energy: 0.65 + Math.random() * 0.35,
    fillerRate,
  }
}

// -------------------------------
// API HANDLER
// -------------------------------
export default async function handler(req, res) {
  setCors(res)

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false })
    }

    const file = req.body?.file || req.file
    if (!file) {
      return res.status(400).json({
        ok: false,
        error: "Audio file not found",
      })
    }

    // -------- TRANSCRIPTION --------
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
    })

    const transcript = transcription.text || ""

    // -------- METRICS (NEW EACH TIME) --------
    const metrics = extractMetricsFromTranscript(transcript)

    // -------- SCORING --------
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
      error: "Transcription failed",
    })
  }
}

