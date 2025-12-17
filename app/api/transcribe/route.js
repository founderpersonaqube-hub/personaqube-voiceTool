import { NextResponse } from "next/server"
import OpenAI from "openai"
import { calculateConfidenceAndPersona } from "../../../lib/voiceScoring.js"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function extractMetrics(transcript) {
  const words = transcript.toLowerCase().split(/\s+/)

  const fillers = [
    "uh",
    "um",
    "like",
    "you know",
    "actually",
    "basically",
    "so",
  ]

  let fillerCount = 0
  words.forEach(w => {
    if (fillers.includes(w)) fillerCount++
  })

  const fillerRate = fillerCount / Math.max(1, words.length)

  return {
    clarity: Math.max(0.4, 1 - fillerRate * 1.6),
    pacing: 0.75,
    energy: 0.8,
    fillerRate,
  }
}

export async function POST(request) {
  let formData

  // ---- SAFETY: multipart parsing must NEVER hang
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid multipart form data" },
      { status: 400 }
    )
  }

  const file = formData.get("file")

  // ---- SAFETY: must be a File
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Audio file missing or invalid" },
      { status: 400 }
    )
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
    })

    const transcript = transcription.text || ""
    const metrics = extractMetrics(transcript)

    const { confidenceScore, personaFit } =
      calculateConfidenceAndPersona(metrics)

    return NextResponse.json({
      ok: true,
      transcript,
      metrics,
      confidenceScore,
      personaFit,
    })
  } catch (err) {
    console.error("WHISPER ERROR:", err)

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Transcription failed",
      },
      { status: 500 }
    )
  }
}

