import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request) {
  try {
    console.log("API HIT")
    console.log("OPENAI_API_KEY present:", !!process.env.OPENAI_API_KEY)

    const formData = await request.formData()
    const file = formData.get("file")

    if (!file) {
      console.error("NO FILE RECEIVED")
      return NextResponse.json(
        { ok: false, error: "No audio file received" },
        { status: 400 }
      )
    }

    console.log("File received:", file.type, file.size)

    if (file.size === 0) {
      return NextResponse.json(
        { ok: false, error: "Empty audio file" },
        { status: 400 }
      )
    }

    let transcript = ""

    try {
      const response = await openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
      })
      transcript = response.text || ""
    } catch (err) {
      console.error("WHISPER ERROR:", err)
      return NextResponse.json(
        { ok: false, error: "Whisper transcription failed" },
        { status: 500 }
      )
    }

    // TEMP: return transcript only (no scoring)
    return NextResponse.json({
      ok: true,
      transcript,
    })
  } catch (err) {
    console.error("FATAL API ERROR:", err)
    return NextResponse.json(
      { ok: false, error: "Fatal server error" },
      { status: 500 }
    )
  }
}

