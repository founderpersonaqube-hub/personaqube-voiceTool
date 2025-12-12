/**
 * pages/api/transcribe.js
 * Compatible with Next.js Pages API (server runtime).
 * Uses formidable to parse multipart/form-data and OpenAI audio transcription.
 *
 * Make sure OPENAI_API_KEY is set in Vercel env vars.
 */
import formidable from "formidable";
import fs from "fs";
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: false, // allow formidable to handle parsing
  },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Allow simple CORS for your Framer origin during testing (adjust in prod)
const ALLOWED_ORIGIN = "https://extended-follow-855444.framer.app";

export default async function handler(req, res) {
  // handle preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const form = new formidable.IncomingForm({ multiples: false });
  form.maxFileSize = 25 * 1024 * 1024; // 25MB

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("form parse error:", err);
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      return res.status(500).json({ ok: false, message: "Failed to parse form", error: String(err) });
    }

    const file = files?.file;
    if (!file) {
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      return res.status(400).json({ ok: false, message: "No file uploaded" });
    }

    try {
      const buffer = fs.readFileSync(file.filepath);

      const transcription = await openai.audio.transcriptions.create({
        file: buffer,
        model: "whisper-1",
      });

      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      return res.status(200).json({ ok: true, transcript: transcription.text ?? "" });
    } catch (error) {
      console.error("transcription error:", error);
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      return res.status(502).json({ ok: false, message: "Transcription failed", error: String(error) });
    } finally {
      try { if (file?.filepath && fs.existsSync(file.filepath)) fs.unlinkSync(file.filepath); } catch (e) {}
    }
  });
}
