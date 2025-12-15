import type { NextApiRequest, NextApiResponse } from "next"
import Busboy from "busboy"
import OpenAI from "openai"

export const config = {
  api: { bodyParser: false },
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" })
  }

  try {
    const fileBuffer = await new Promise<Buffer>((resolve, reject) => {
      const bb = Busboy({ headers: req.headers })
      let buffer = Buffer.alloc(0)

      bb.on("file", (_, file) => {
        file.on("data", (data) => {
          buffer = Buffer.concat([buffer, data])
        })
      })

      bb.on("finish", () => resolve(buffer))
      bb.on("error", reject)

      req.pipe(bb)
    })

    if (!fileBuffer.length) {
      return res.status(400).json({ ok: false, message: "No audio received" })
    }

    //  Transcription
    const transcription = await openai.audio.transcriptions.create({
      file: new File([fileBuffer], "voice.webm", { type: "audio/webm" }),
      model: "gpt-4o-transcribe",
    })

    const text = transcription.text || ""

    //  Simple metrics (safe)
    const fillerCount = (text.match(/\b(um|uh|like|you know)\b/gi) || []).length
    const wordCount = Math.max(text.split(/\s+/).length, 1)

    const fillerRate = fillerCount / wordCount

    const metrics = {
      clarity: Math.max(0, 1 - fillerRate),
      pacing: 0.8,
      energy: 0.8,
      fillerRate,
    }

    const personaFit = {
      Leader: Math.max(0, 1 - fillerRate * 1.2),
      Trainer: Math.max(0, 0.9 - fillerRate),
      Coach: Math.max(0, 0.8 - fillerRate),
      Creator: Math.max(0, 0.7 - fillerRate),
    }

    //  ALWAYS return JSON
    return res.status(200).json({
      ok: true,
      analysis: {
        transcript: text,
        metrics,
        personaFit,
      },
    })
  } catch (err: any) {
    //  IMPORTANT: JSON ONLY
    return res.status(500).json({
      ok: false,
      message: "Transcription failed",
      error: err?.message || "Unknown error",
    })
  }
}

