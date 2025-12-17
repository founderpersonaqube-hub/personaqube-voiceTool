import OpenAI from "openai"
import { NextResponse } from "next/server"

import { extractMetrics } from "@/lib/metrics"
import { computeOverallConfidence } from "@/lib/voiceScoring"
import { generatePersonaInsights } from "@/lib/voiceInsights"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/* ✅ CORS HEADERS */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://personaqube.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }
}

/* ✅ Preflight handler (CRITICAL) */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  })
}

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || ""

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { ok: false, error: "Invalid Content-Type" },
        { status: 400, headers: corsHeaders() }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Audio file missing" },
        { status: 400, headers: corsHeaders() }
      )
    }

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
    })

    const transcript = transcription.text || ""

    const metrics = extractMetrics(transcript)
    const { confidenceScore, personaFit } =
      computeOverallConfidence(metrics)

    const insights = generatePersonaInsights(personaFit, metrics)

    return NextResponse.json(
      {
        ok: true,
        transcript,
        metrics,
        confidenceScore,
        personaFit,
        insights,
      },
      { headers: corsHeaders() }
    )
  } catch (err) {
    console.error("TRANSCRIBE ERROR:", err)

    return NextResponse.json(
      { ok: false, error: err.message || "Server error" },
      { status: 500, headers: corsHeaders() }
    )
  }
}

