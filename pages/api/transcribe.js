import OpenAI from "openai"
import Busboy from "busboy"

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

  try {
    const busboy = Busboy({ headers: req.headers })

    let audioBuffer = null
    let mimeType = null

    busboy.on("file", (_, file, info) => {
      mimeType = info.mimeType
      const chunks = []

      file.on("data", (data) => chunks.push(data))
      file.on("end", () => {
        audioBuffer = Buffer.concat(chunks)
      })
    })

    busboy.on("finish", async () => {
      if (!audioBuffer) {
        return res.status(400).json({
          ok: false,
          error: "Audio file not received",
        })
      }

      // 🔐 IMPORTANT: must match actual recorded format
      if (!mimeType || !mimeType.includes("webm")) {
        return res.status(400).json({
          ok: false,
          error: `Unsupported mime type: ${mimeType}`,
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

      return res.status(200).json({
        ok: true,
        transcript: transcription.text,
      })
    })

    req.pipe(busboy)
  } catch (err) {
    console.error("WHISPER ERROR:", err)

    return res.status(500).json({
      ok: false,
      error: err.message || "Transcription failed",
    })
  }
}

