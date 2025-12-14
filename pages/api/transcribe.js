// pages/api/transcribe.js
import Busboy from "busboy";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

export const config = {
  api: { bodyParser: false },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Single, correct CORS handler
function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  // Handle preflight
  if (req.method === "OPTIONS") {
    applyCors(req, res);
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    applyCors(req, res);
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const tmpDir = "/tmp";

    const filePath = await new Promise((resolve, reject) => {
      const busboy = Busboy({ headers: req.headers });
      let savedFilePath = null;

      busboy.on("file", (_field, file, info) => {
        const tempPath = path.join(
          tmpDir,
          `upload-${Date.now()}-${info.filename}`
        );

        const writeStream = fs.createWriteStream(tempPath);
        file.pipe(writeStream);

        writeStream.on("finish", () => resolve(tempPath));
        writeStream.on("error", reject);
      });

      busboy.on("error", reject);
      req.pipe(busboy);
    });

    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error("Uploaded file missing on server");
    }

    const readStream = fs.createReadStream(filePath);

    const transcription = await openai.audio.transcriptions.create({
      file: readStream,
      model: "whisper-1",
    });

    try { fs.unlinkSync(filePath); } catch {}

    applyCors(req, res);
    return res.status(200).json({
      ok: true,
      transcript: transcription?.text ?? "",
    });
  } catch (err) {
    console.error("Transcription error:", err);
    applyCors(req, res);
    return res.status(500).json({
      ok: false,
      message: "Transcription failed",
      error: String(err),
    });
  }
}

