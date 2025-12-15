import Busboy from "busboy"
import OpenAI from "openai"

export const config = {
  api: { bodyParser: false },
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.json({ ok: false, error: "Invalid method" })
    }

    const busboy = new Busboy({ headers: req.headers })
    let audioBuffer = Buffer.alloc(0)

    busboy.on("file", (_, file) => {
      file.on("data", (d) => (audioBuffer = Buffer.concat([audioBuffer, d])))
    })

    busboy.on("finish", async () => {
      try {
        const transcription = await openai.audio.transcriptions.create({
          file: new File([audioBuffer], "voice.webm"),
          model: "gpt-4o-transcribe",
        })

        const transcript = transcription.text || ""

        const fillerCount = (transcript.match(/\b(um|uh|like)\b/gi) || []).length

        const analysis = {
          transcript,
          metrics: {
            clarity: 0.8,
            pacing: 0.7,
            energy: 0.6,
            fillerRate: fillerCount / Math.max(1, transcript.split(" ").length),
          },
          personaFit: {
            Leader: 90,
            Coach: 75,
            Trainer: 70,
            Creator: 65,
          },
        }

        res.json({ ok: true, analysis })
      } catch (e) {
        res.json({ ok: false, error: e.message })
      }
    })

    req.pipe(busboy)
  } catch (e) {
    res.json({ ok: false, error: e.message })
  }
}

