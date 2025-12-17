import OpenAI from "openai"
import { NextResponse } from "next/server"

import { extractMetrics } from "@/lib/metrics"
import { computeOverallConfidence } from "@/lib/voiceScoring"
import { generatePersonaInsights } from "@/lib/voiceInsights"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || ""

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Content-Type must be "multipart/form-data" with a file field',
        },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Audio file missing" },
        { status: 400 }
      )
    }

    // 1️⃣ Transcription
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
    })

    const transcript = transcription.text || ""

    // 2️⃣ Metrics
    const metrics = extractMetrics(transcript)

    // 3️⃣ Confidence + Persona
    const { confidenceScore, personaFit } =
      computeOverallConfidence(metrics)

    // 4️⃣ Persona Insights
    const insights = generatePersonaInsights(personaFit, metrics)

    return NextResponse.json({
      ok: true,
      transcript,
      metrics,
      confidenceScore,
      personaFit,
      insights,
    })
  } catch (err) {
    console.error("TRANSCRIBE ERROR:", err)

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Transcription failed",
      },
      { status: 500 }
    )
  }
}

