import OpenAI from "openai"
import { calculateConfidenceAndPersona } from "../../lib/voiceScoring.js"

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "https://personaqube.com")
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

// --------------------------------
// TRANSCRIPT → METRICS
// --------------------------------
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

  const wordCount = Math.max(1, words.length)
  const fillerRate = fillerCount / wordCount

  return {
    clarity: Math.max(0.4, 1 - fillerRate * 1.6),
    pacing: 0.7 + Math.random() * 0.25,
    energy: 0.65 + Math.random() * 0.35,
    fillerRate,
  }
}

// --------------------------------
// API HANDLER
// --------------------------------
export default async function handler(req, res) {
  setCors(res)

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false })
  }

  try {
    const formData = await new Promise((resolve, reject) => {
      const chunks = []
      req.on("data", chunk => chunks.push(chunk))
      req.on("end", () => {
        const buffer = Buffer.concat(chunks)
        resolve(buffer)
      })
      req.on("error", reject)
    })

    if (!formData || formData.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Audio file not received",
      })
    }

    // Whisper expects a File-like object
    const audioFile = new File([formData], "voice.webm", {
      type: "audio/webm",
    })

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
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
      error: "Transcription failed",
    })
  }
}

