// pages/api/transcribe.js
import Busboy from "busboy";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: false, // IMPORTANT: disable Next.js body parsing
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  try {
    const tmpDir = "/tmp"; // Vercel's writable temp directory

    const filePath = await new Promise((resolve, reject) => {
      const busboy = Busboy({ headers: req.headers });

      let savedFilePath = null;

      busboy.on("file", (_fieldname, file, info) => {
        const { filename } = info;
        const tempName = `upload-${Date.now()}-${filename}`;
        const tempPath = path.join(tmpDir, tempName);

        const writeStream = fs.createWriteStream(tempPath);
        file.pipe(writeStream);

        file.on("end", () => {
          savedFilePath = tempPath;
        });

        writeStream.on("finish", () => {
          resolve(savedFilePath);
        });

        writeStream.on("error", (err) => reject(err));
      });

      busboy.on("error", (err) => reject(err));
      req.pipe(busboy);
    });

    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error("File was not saved properly.");
    }

    // OpenAI needs a read stream — this fixes "Could not parse multipart form"
    const readStream = fs.createReadStream(filePath);

    const transcription = await openai.audio.transcriptions.create({
      file: readStream,
      model: "whisper-1",
    });

    // Cleanup temporary file
    try {
      fs.unlinkSync(filePath);
    } catch (e) {}

    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);

    return res.status(200).json({
      ok: true,
      transcript: transcription?.text ?? "",
    });
  } catch (err) {
    console.error("Transcription error:", err);

    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);

    return res.status(500).json({
      ok: false,
      message: "Transcription failed",
      error: String(err),
    });
  }
}

