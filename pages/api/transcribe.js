import Busboy from "busboy"
import OpenAI from "openai"
import {
  computeConfidenceScore,
  confidenceLabel,
  computePersonaFit,
  getTopPersonas,
} from "@/lib/voiceScoring"
import {
  confidenceExplanation,
  personaExplanation,
  improvementTips,
} from "@/lib/voiceInsights"

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "https://personaqube.com")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
}

export const config = {
  api: { bodyParser: false },
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const FILLER_WORDS = ["um", "uh", "like", "you know", "actually", "basically"]

function countFillers(text) {
  const lower = text.toLowerCase()
  let count = 0
  for (const w of FILLER_WORDS) {
    const matches = lower.match(new RegExp(`\\b${w}\\b`, "g"))
    if (matches) count += matches.length
  }
  return count
}

function clamp(n, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n))
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
    const busboy = Busboy({ headers: req.headers })
    let audioBuffer = null

    busboy.on("file", (_, file) => {
      const chunks = []
      file.on("data", d => chunks.push(d))
      file.on("end", () => {
        audioBuffer = Buffer.concat(chunks)
      })
    })

    busboy.on("finish", async () => {
      if (!audioBuffer) {
        return res.status(400).json({ ok: false, error: "No audio file" })
      }

      // 🎤 TRANSCRIPTION
      const transcription = await openai.audio.transcriptions.create({
        file: new File([audioBuffer], "voice.webm"),
        model: "gpt-4o-transcribe",
      })

      const transcript = transcription.text || ""

      // 📊 METRICS
      const wordCount = transcript.split(/\s+/).length
      const fillerCount = countFillers(transcript)
      const fillerRate = clamp(fillerCount / Math.max(wordCount, 1))

      const clarity = clamp(1 - fillerRate * 1.2)
      const pacing = clamp(wordCount > 120 ? 0.7 : 0.9)
      const energy = clamp(0.8 - fillerRate * 0.5)

      // 🧠 CONFIDENCE SCORE (STRICT)
      const confidenceScore = Math.round(
        clamp(
          clarity * 0.35 +
          pacing * 0.25 +
          energy * 0.25 -
          fillerRate * 0.3
        ) * 100
      )

      // 🎭 PERSONA FIT (STYLE ONLY)
      const personaFit = {
        Leader: Math.round(clamp(energy * 0.9 + clarity * 0.3) * 100),
        Trainer: Math.round(clamp(clarity * 0.8 + pacing * 0.3) * 100),
        Coach: Math.round(clamp(clarity * 0.9 + energy * 0.2) * 100),
        Creator: Math.round(clamp(energy * 0.7 + pacing * 0.4) * 100),
      }
      const explanation = confidenceExplanation(confidenceScore)
      const personaWhy = personaExplanation(bestPersona)
      const tips = improvementTips(metrics)

      return res.status(200).json({
        ok: true,
        analysis: {
          transcript,
          metrics: {
            clarity,
            pacing,
            energy,
            fillerRate,
            fillerCount,
            wordCount,
          },
          confidenceScore,
          personaFit,
	  explanation,
          personaWhy,
          tips,
        },
      })
    })

    req.pipe(busboy)
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || "Server error",
    })
  }
}

