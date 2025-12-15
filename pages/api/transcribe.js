import OpenAI from "openai"
import Busboy from "busboy"

export const config = {
  api: { bodyParser: false },
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    })
  }

  try {
    const busboy = Busboy({ headers: req.headers })
    const chunks = []

    busboy.on("file", (_, file) => {
      file.on("data", (data) => chunks.push(data))
    })

    busboy.on("finish", async () => {
      try {
        const audioBuffer = Buffer.concat(chunks)

        const transcription = await openai.audio.transcriptions.create({
          file: new File([audioBuffer], "voice.webm", {
            type: "audio/webm",
          }),
          model: "gpt-4o-transcribe",
        })

        // 🚨 ALWAYS RETURN JSON
        return res.status(200).json({
          ok: true,
          analysis: {
            transcript: transcription.text,
          },
        })
      } catch (err) {
        return res.status(200).json({
          ok: false,
          error: err.message || "Transcription failed",
        })
      }
    })

    req.pipe(busboy)
  } catch (err) {
    return res.status(200).json({
      ok: false,
      error: err.message || "Server error",
    })
  }
}

