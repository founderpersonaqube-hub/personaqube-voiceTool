import OpenAI from "openai"
import { NextResponse } from "next/server"
import { extractMetrics } from "@/lib/metrics"
import { computeOverallConfidence } from "@/lib/voiceScoring"
import { generatePersonaInsights } from "@/lib/voiceInsights"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  project: process.env.OPENAI_PROJECT_ID,
})

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || ""

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Content-Type must be "multipart/form-data" (audio upload required)',
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

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
    })

    const transcript = transcription.text || ""

    const metrics = extractMetrics(transcript)
    const confidenceScore = computeOverallConfidence(metrics)
    const personaFit = metrics.personaFit
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
        error: err?.message || "Internal transcription failure",
      },
      { status: 500 }
    )
  }
}

