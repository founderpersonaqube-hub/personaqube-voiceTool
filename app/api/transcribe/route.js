import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request) {
  try {
    const body = await request.json()
    const base64Audio = body.audio

    if (!base64Audio) {
      return NextResponse.json(
        { ok: false, error: "Missing audio data" },
        { status: 400 }
      )
    }

    // Convert base64 → Buffer
    const audioBuffer = Buffer.from(base64Audio, "base64")

    if (audioBuffer.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Empty audio buffer" },
        { status: 400 }
      )
    }

    // Whisper transcription
    const transcription = await openai.audio.transcriptions.create({
      file: audioBuffer,
      model: "whisper-1",
    })

    const transcript = transcription.text || ""

    return NextResponse.json({
      ok: true,
      transcript,
    })
  } catch (err) {
    console.error("TRANSCRIBE ERROR:", err)
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    )
  }
}

