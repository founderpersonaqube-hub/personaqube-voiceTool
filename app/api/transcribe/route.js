import { NextResponse } from "next/server";
import formidable from "formidable";
import fs from "fs";
import OpenAI from "openai";

// App Router requirements
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; 

const ALLOWED_ORIGIN = "https://extended-follow-855444.framer.app";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to parse multipart form
function parseForm(request) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false });
    form.parse(request, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

// Handle POST /api/transcribe
export async function POST(request) {
  try {
    const { files } = await parseForm(request);
    const file = files?.file;

    if (!file) {
      return NextResponse.json({ ok: false, message: "No file uploaded" }, { status: 400 });
    }

    const buffer = fs.readFileSync(file.filepath);

    const transcription = await openai.audio.transcriptions.create({
      file: buffer,
      model: "whisper-1",
    });

    return NextResponse.json(
      { ok: true, transcript: transcription.text },
      { status: 200, headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN } }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, message: "Transcription failed", error: String(err) },
      { status: 500, headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN } }
    );
  }
}

// Handle OPTIONS (CORS)
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

