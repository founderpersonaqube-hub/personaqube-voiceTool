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

  const uploadDir = "/tmp"
  const filePath = path.join(uploadDir, `voice-${Date.now()}.webm`)

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

      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
      })

      const transcript = transcription.text || ""

      // Simple metrics (stable)
      const words = transcript.split(/\s+/).filter(Boolean)
      const fillers = transcript.match(/\b(um|uh|like|you know)\b/gi) || []

      const metrics = {
        clarity: 0.9,
        pacing: 0.85,
        energy: 0.8,
        fillerRate: words.length ? fillers.length / words.length : 0,
      }

      fs.unlinkSync(filePath)

      return res.status(200).json({
        ok: true,
        transcript,
        metrics,
      })
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: err.message || "Server error",
      })
    }
  })

  req.pipe(busboy)
}

