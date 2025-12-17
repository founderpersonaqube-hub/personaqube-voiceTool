import OpenAI from "openai"
import { NextResponse } from "next/server"

import { extractMetrics } from "../../../lib/metrics"
import { computeOverallConfidence } from "../../../lib/voiceScoring"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Audio file missing" },
        { status: 400 }
      )
    }

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
    })

    const transcript = transcription.text || ""
    const metrics = extractMetrics(transcript)
    const { confidenceScore, personaFit } =
      computeOverallConfidence(metrics)

    return NextResponse.json({
      ok: true,
      transcript,
      metrics,
      confidenceScore,
      personaFit,
    })
  } catch (err) {
    console.error("TRANSCRIBE ERROR:", err)
    return NextResponse.json(
      { ok: false, error: err.message || "Server error" },
      { status: 500 }
    )
  }
}

