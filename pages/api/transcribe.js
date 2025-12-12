// pages/api/transcribe.js
import { IncomingForm } from "formidable";
import fs from "fs";
import OpenAI from "openai";

export const config = {
  api: { bodyParser: false },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ALLOWED_ORIGIN = "https://extended-follow-855444.framer.app";

export default async function handler(req, res) {
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

  // Quick check so we see whether the key exists in runtime
  console.log("OPENAI_API_KEY present:", !!process.env.OPENAI_API_KEY);

  const form = new IncomingForm({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      return res.status(500).json({ ok: false, message: "Failed to parse form", error: String(err) });
    }

    // Robustly pick the uploaded file regardless of structure
    let file = files?.file;
    if (Array.isArray(file)) file = file[0];

    if (!file) {
      // pick first file value if field name differs
      const vals = Object.values(files || {});
      if (vals.length > 0) file = Array.isArray(vals[0]) ? vals[0][0] : vals[0];
    }

    if (!file) {
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      return res.status(400).json({ ok: false, message: "No file uploaded" });
    }

    // Try common property names for the temp path
    const possiblePaths = [
      file.filepath,
      file.path,
      file.filePath,
      file.tempFilePath,
      file.tempFilepath,
      file.tempFile,
    ];

    const filepath = possiblePaths.find(p => typeof p === "string" && p.length > 0);

    if (!filepath) {
      // helpful debug: show which keys exist on the file object (no content)
      const fileKeys = Object.keys(file || {});
      console.error("Uploaded file object missing path. keys:", fileKeys);
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      return res.status(500).json({
        ok: false,
        message: "Uploaded file missing server path (cannot read temp file)",
        fileKeys,
      });
    }

    try {
      const buffer = fs.readFileSync(filepath);

      // Call OpenAI transcription
      const transcription = await openai.audio.transcriptions.create({
        file: buffer,
        model: "whisper-1",
      });

      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      return res.status(200).json({
        ok: true,
        transcript: transcription?.text ?? "",
      });
    } catch (error) {
      console.error("Transcription error:", error);
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      return res.status(500).json({
        ok: false,
        message: "Transcription failed",
        error: String(error),
      });
    } finally {
      // attempt to clean temp file(s) if path is known
      try { if (filepath && fs.existsSync(filepath)) fs.unlinkSync(filepath); } catch (e) {}
    }
  });
}

