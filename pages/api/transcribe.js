// pages/api/transcribe.js
import Busboy from "busboy";
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: false,
  },
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

  try {
    const fileBuffer = await new Promise((resolve, reject) => {
      const busboy = Busboy({ headers: req.headers });
      let chunks = [];

      busboy.on("file", (_, file) => {
        file.on("data", (data) => chunks.push(data));
        file.on("end", () => resolve(Buffer.concat(chunks)));
      });

      busboy.on("error", reject);
      busboy.on("finish", () => {
        if (chunks.length === 0) reject(new Error("No file received"));
      });

      req.pipe(busboy);
    });

    // send to OpenAI
    const transcription = await openai.audio.transcriptions.create({
      file: fileBuffer,
      model: "whisper-1",
    });

    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    return res.status(200).json({
      ok: true,
      transcript: transcription.text ?? "",
    });
  } catch (err) {
    console.error("Error:", err);
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    return res.status(500).json({
      ok: false,
      message: "Transcription failed",
      error: String(err),
    });
  }
}

