import { NextResponse } from "next/server"
import OpenAI from "openai"

import { extractMetrics } from "@/lib/metrics"
import { computeOverallConfidence } from "@/lib/voiceScoring"
import { generatePersonaInsights } from "@/lib/voiceInsights"

export async function POST(request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY missing" },
        { status: 500 }
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

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
    })

    const transcript = transcription?.text?.trim()
    if (!transcript) {
      return NextResponse.json(
        { ok: false, error: "Empty transcript" },
        { status: 500 }
      )
    }

    const metrics = extractMetrics(transcript)
    const { confidenceScore, personaFit } =
      computeOverallConfidence(metrics)

    const insights = generatePersonaInsights(
      personaFit,
      metrics
    )

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
      { ok: false, error: err.message || "Server error" },
      { status: 500 }
    )
  }
}

