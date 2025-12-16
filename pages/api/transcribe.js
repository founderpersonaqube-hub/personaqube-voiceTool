import Busboy from "busboy"
import fs from "fs"
import path from "path"
import OpenAI from "openai"

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

export default async function handler(req, res) {
setCors(res)


  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" })
  }

  res.setHeader("Cache-Control", "no-store")

  const filePath = path.join("/tmp", `voice-${Date.now()}.webm`)
  let writePromise = null

  const busboy = Busboy({ headers: req.headers })

  busboy.on("file", (_, file) => {
    const writeStream = fs.createWriteStream(filePath)
    file.pipe(writeStream)

    writePromise = new Promise((resolve, reject) => {
      writeStream.on("finish", resolve)
      writeStream.on("error", reject)
    })
  })

  busboy.on("finish", async () => {
    try {
      if (!writePromise) {
        throw new Error("No file uploaded")
      }

      await writePromise

      // ----------------------------
      // TRANSCRIPTION
      // ----------------------------
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
	language: "en",
      })

      const transcript = transcription.text || ""

      // ----------------------------
      // METRICS (SAFE)
      // ----------------------------
      const words = transcript.split(/\s+/).filter(Boolean)
      const fillers = transcript.match(/\b(um|uh|like|you know)\b/gi) || []

      const metrics = {
        clarity: 0.9,
        pacing: 0.85,
        energy: 0.8,
        fillerRate: words.length ? fillers.length / words.length : 0,
      }

      // ----------------------------
      // CONFIDENCE SCORE (0–100)
      // ----------------------------
      const confidenceScore = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            metrics.clarity * 35 +
              metrics.energy * 25 +
              metrics.pacing * 20 +
              (1 - metrics.fillerRate) * 20
          )
        )
      )

      // ----------------------------
      // PERSONA FIT
      // ----------------------------
      const personaFit = {
        Leader: Math.max(0, confidenceScore - metrics.fillerRate * 30),
        Coach: Math.max(0, confidenceScore + 5),
        Trainer: Math.max(0, confidenceScore - 3),
        Creator: Math.max(0, confidenceScore - 8),
      }

      fs.unlinkSync(filePath)

      return res.status(200).json({
        ok: true,
        transcript,
        metrics,
        confidenceScore,
        personaFit,
      })
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: err.message || "Internal Server Error",
      })
    }
  })

  req.pipe(busboy)
}

