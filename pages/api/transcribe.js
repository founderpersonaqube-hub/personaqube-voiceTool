import OpenAI from "openai"
import Busboy from "busboy"

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

export default function handler(req, res) {
setCors(res)


  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    })
  }

  let responded = false
  const safeJson = (status, body) => {
    if (!responded) {
      responded = true
      res.status(status).json(body)
    }
  }

  try {
    const busboy = Busboy({ headers: req.headers })
    const chunks = []

    busboy.on("file", (_, file) => {
      file.on("data", (data) => chunks.push(data))
    })

    busboy.on("finish", async () => {
      if (chunks.length === 0) {
        return safeJson(400, {
          ok: false,
          error: "No audio file received",
        })
      }

      try {
        const audioBuffer = Buffer.concat(chunks)

        const transcription = await openai.audio.transcriptions.create({
          file: new File([audioBuffer], "voice.webm", {
            type: "audio/webm",
          }),
          model: "gpt-4o-transcribe",
        })

        return safeJson(200, {
          ok: true,
          analysis: {
            transcript: transcription.text || "",
          },
        })
      } catch (err) {
        return safeJson(500, {
          ok: false,
          error: err.message || "Transcription failed",
        })
      }
    })

    busboy.on("error", (err) => {
      return safeJson(500, {
        ok: false,
        error: "Upload failed",
      })
    })

    req.pipe(busboy)
  } catch (err) {
    return safeJson(500, {
      ok: false,
      error: "Unexpected server error",
    })
  }
}

