import OpenAI from "openai"
import Busboy from "busboy"
import { calculateConfidenceAndPersona } from "../../lib/voiceScoring.js"

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

export const config = {
  api: {
    bodyParser: false,
  },
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  setCors(res)

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" })
  }

  const busboy = Busboy({ headers: req.headers })

  let audioBuffer = null
  let mimeType = null
  let responded = false

  function safeRespond(status, payload) {
    if (responded) return
    responded = true
    res.status(status).json(payload)
  }

  busboy.on("file", (_, file, info) => {
    mimeType = info.mimeType
    const chunks = []

    file.on("data", (data) => chunks.push(data))
    file.on("end", () => {
      audioBuffer = Buffer.concat(chunks)
    })
  })

  busboy.on("error", (err) => {
    console.error("BUSBOY ERROR:", err)
    safeRespond(400, { ok: false, error: "Upload error" })
  })

  busboy.on("finish", async () => {
    try {
      if (!audioBuffer) {
        return safeRespond(400, {
          ok: false,
          error: "No audio received",
        })
      }

      if (!mimeType || !mimeType.includes("webm")) {
        return safeRespond(400, {
          ok: false,
          error: `Unsupported format: ${mimeType}`,
        })
      }

      const transcription = await openai.audio.transcriptions.create({
        file: {
          value: audioBuffer,
          filename: "voice.webm",
          contentType: "audio/webm",
        },
        model: "whisper-1",
      })

      const transcript = transcription.text || ""

// SIMPLE metric extraction (per request)
const words = transcript.toLowerCase().split(/\s+/)
const fillerWords = ["uh", "um", "like", "you know", "actually", "basically", "so"]

let fillerCount = 0
words.forEach(w => {
  if (fillerWords.includes(w)) fillerCount++
})

const fillerRate = fillerCount / Math.max(1, words.length)

const metrics = {
  clarity: Math.max(0.4, 1 - fillerRate * 1.6),
  pacing: 0.75,
  energy: 0.8,
  fillerRate,
}

const { confidenceScore, personaFit } =
  calculateConfidenceAndPersona(metrics)

safeRespond(200, {
  ok: true,
  transcript,
  metrics,
  confidenceScore,
  personaFit,
})

    } catch (err) {
      console.error("WHISPER ERROR:", err)
      safeRespond(500, {
        ok: false,
        error: err.message || "Transcription failed",
      })
    }
  })

  // 🔴 THIS LINE IS CRITICAL — DO NOT REMOVE
  req.pipe(busboy)
}

