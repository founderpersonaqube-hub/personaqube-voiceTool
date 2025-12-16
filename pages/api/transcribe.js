import OpenAI from "openai"
import Busboy from "busboy"
import { calculateConfidenceAndPersona } from "../../lib/voiceScoring.js"

export const config = {
  api: {
    bodyParser: false,
  },
}

/* -------------------- CORS -------------------- */
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
}

function sendJson(res, status, payload) {
  setCors(res)
  res.status(status).json(payload)
}

/* -------------------- OpenAI -------------------- */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/* -------------------- Metrics -------------------- */
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

/* -------------------- Handler -------------------- */
export default function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    setCors(res)
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false })
  }

  const busboy = Busboy({ headers: req.headers })

  let audioBuffer = null
  let mimeType = null
  let hasResponded = false

  const safeSend = (status, payload) => {
    if (hasResponded) return
    hasResponded = true
    sendJson(res, status, payload)
  }

  busboy.on("file", (_, file, info) => {
    mimeType = info.mimeType
    const chunks = []

    file.on("data", chunk => chunks.push(chunk))
    file.on("end", () => {
      audioBuffer = Buffer.concat(chunks)
    })
  })

  busboy.on("error", err => {
    console.error("BUSBOY ERROR:", err)
    safeSend(400, { ok: false, error: "Upload failed" })
  })

  busboy.on("finish", async () => {
    try {
      if (!audioBuffer) {
        return safeSend(400, {
          ok: false,
          error: "No audio received",
        })
      }

      if (!mimeType || !mimeType.includes("webm")) {
        return safeSend(400, {
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
        language: "en",
      })

      const transcript = transcription.text || ""
      const metrics = extractMetrics(transcript)

      const { confidenceScore, personaFit } =
        calculateConfidenceAndPersona(metrics)

      return safeSend(200, {
        ok: true,
        transcript,
        metrics,
        confidenceScore,
        personaFit,
      })
    } catch (err) {
      console.error("TRANSCRIPTION ERROR:", err)
      return safeSend(500, {
        ok: false,
        error: err.message || "Transcription failed",
      })
    }
  })

  req.pipe(busboy)
}

