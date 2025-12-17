import { NextResponse } from "next/server"
import OpenAI from "openai"

import { extractMetrics } from "@/lib/metrics"
import { computeOverallConfidence } from "@/lib/voiceScoring"
import { generatePersonaInsights } from "@/lib/voiceInsights"

/**
 * IMPORTANT:
 * - This route ONLY supports POST
 * - It ALWAYS returns JSON
 * - It NEVER throws uncaught errors
 */

export async function POST(request) {
  console.log("TRANSCRIBE ROUTE HIT")

  try {
    // 1️⃣ Check API key early (prevents silent 500 HTML errors)
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY is missing" },
        { status: 500 }
      )
    }

    // 2️⃣ Read multipart form safely
    let formData
    try {
      formData = await request.formData()
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: "Could not parse multipart form" },
        { status: 400 }
      )
    }

    const file = formData.get("file")

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Audio file missing" },
        { status: 400 }
      )
    }

    // 3️⃣ Init OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // 4️⃣ Transcribe audio
    let transcription
    try {
      transcription = await openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
        language: "en",
      })
    } catch (err) {
      console.error("WHISPER ERROR:", err)
      return NextResponse.json(
        { ok: false, error: "Transcription failed" },
        { status: 500 }
      )
    }

    const transcript = transcription?.text?.trim() || ""

    if (!transcript) {
      return NextResponse.json(
        { ok: false, error: "Empty transcript returned" },
        { status: 500 }
      )
    }

    // 5️⃣ Metrics extraction (safe)
    const metrics = extractMetrics(transcript)

    // 6️⃣ Confidence + persona scoring
    const { confidenceScore, personaFit } =
      computeOverallConfidence(metrics)

    // 7️⃣ Persona insights (copy)
    const insights = generatePersonaInsights({
      transcript,
      metrics,
      confidenceScore,
      personaFit,
    })

    // 8️⃣ Final JSON response (ONLY JSON)
    return NextResponse.json({
      ok: true,
      transcript,
      metrics,
      confidenceScore,
      personaFit,
      insights,
    })
  } catch (err) {
    // 🚨 Absolute last-resort catch
    console.error("FATAL TRANSCRIBE ERROR:", err)

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unexpected server error",
      },
      { status: 500 }
    )
  }
}

