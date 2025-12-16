// pages/api/transcribe.js

import OpenAI from "openai"
import { computeConfidence, computePersonaFit } from "../../lib/voiceScoring"
import Busboy from "busboy"

export const config = {
  api: { bodyParser: false },
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*") // safe for now
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
}

export default async function handler(req, res) {
  setCors(res)

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" })
  }

  try {
    const audioChunks = []

    await new Promise((resolve, reject) => {
      const busboy = Busboy({ headers: req.headers })

      busboy.on("file", (_fieldname, file) => {
        file.on("data", (data) => {
          audioChunks.push(data)
        })
      })

      busboy.on("finish", resolve)
      busboy.on("error", reject)

      req.pipe(busboy)
    })

    if (audioChunks.length === 0) {
      return res.status(400).json({ error: "No audio received" })
    }

    // 🔹 AUDIO BUFFER (future Whisper input)
    const audioBuffer = Buffer.concat(audioChunks)

    // 🔹 TRANSCRIPTION (Phase 2 placeholder)
    const transcript =
      "Hi everyone, this is Ravi here. I am excited to record my voice."

    // 🔹 METRICS (Phase 2.1 logic)
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
    console.error("Transcribe API Error:", err)
    return res.status(500).json({ error: "Analysis failed" })
  }
}

