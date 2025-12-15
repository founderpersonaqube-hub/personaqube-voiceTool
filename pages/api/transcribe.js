import Busboy from "busboy"
import OpenAI from "openai"

export const config = {
  api: { bodyParser: false },
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" })
  }

  try {
    const busboy = Busboy({ headers: req.headers })
    let audioBuffer = Buffer.alloc(0)

    busboy.on("file", (_, file) => {
      file.on("data", (data) => {
        audioBuffer = Buffer.concat([audioBuffer, data])
      })
    })

    busboy.on("finish", async () => {
      try {
        const transcription = await openai.audio.transcriptions.create({
          file: new File([audioBuffer], "voice.webm", { type: "audio/webm" }),
          model: "gpt-4o-transcribe",
        })

        // VERY IMPORTANT: Always return JSON
        return res.status(200).json({
          ok: true,
          transcript: transcription.text,
        })
      } catch (err) {
        return res.status(500).json({
          ok: false,
          error: "Transcription failed",
        })
      }
    })

    req.pipe(busboy)
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "Unexpected server error",
    })
  }
}

