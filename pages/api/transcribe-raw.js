// pages/api/transcribe-raw.js
import OpenAI from "openai";

export default async function handler(req, res) {
  // Small safeguard
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  // Expect JSON: { "filename": "sample.mp3", "b64": "<base64 string>" }
  try {
    const { filename = "upload.bin", b64 } = req.body || {};

    if (!b64) {
      return res.status(400).json({ ok: false, message: "Missing base64 payload 'b64' in JSON body" });
    }

    // decode base64
    const buffer = Buffer.from(b64, "base64");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // call OpenAI transcription
    // The SDK accepts a Buffer as file. If your version differs, I will adjust.
    const transcription = await openai.audio.transcriptions.create({
      file: buffer,
      model: "whisper-1",
      // optionally provide filename or language here
    });

    return res.status(200).json({ ok: true, transcript: transcription?.text ?? "" });
  } catch (err) {
    console.error("transcribe-raw error:", err);
    return res.status(500).json({ ok: false, message: "Transcription failed", error: String(err) });
  }
}

