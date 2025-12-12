// app/api/transcribe/route.js
import { NextResponse } from "next/server"
import formidable from "formidable"
import fs from "fs"
import OpenAI from "openai"

export const runtime = "nodejs"
export const config = { api: { bodyParser: false } }

const ALLOWED_ORIGIN = "'"${FRAMER_ORIGIN}"'".replace(/'/g,"") // will be replaced at runtime; kept here for clarity

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req) {
  // preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  }

  if (req.method !== "POST") {
    return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405, headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN } })
  }

  const form = new formidable.IncomingForm({ multiples: false })
  form.maxFileSize = 25 * 1024 * 1024

  const parsed = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err)
      resolve({ fields, files })
    })
  })

  const file = parsed.files?.file
  if (!file) {
    return NextResponse.json({ ok: false, message: "No file uploaded" }, { status: 400, headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN } })
  }

  try {
    const buffer = fs.readFileSync(file.filepath)

    const transcription = await openai.audio.transcriptions.create({
      file: buffer,
      model: "whisper-1",
    })

    return NextResponse.json({ ok: true, transcript: transcription.text }, { headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN } })
  } catch (err) {
    console.error("Transcription error:", err)
    return NextResponse.json({ ok: false, message: "Transcription failed", error: String(err) }, { status: 502, headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN } })
  } finally {
    try { if (file?.filepath && fs.existsSync(file.filepath)) fs.unlinkSync(file.filepath) } catch (e) {}
  }
}
