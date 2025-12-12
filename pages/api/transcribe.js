import formidable from "formidable";
import fs from "fs";
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: false,
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

  const form = new formidable.IncomingForm({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      return res.status(500).json({ ok: false, message: "Failed to parse form" });
    }

    const file = files.file;
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
      return res.status(200).json({
        ok: true,
        transcript: transcription.text ?? "",
      });
    } catch (error) {
      console.error(error);
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      return res.status(500).json({ ok: false, message: "Transcription failed", error });
    } finally {
      try { fs.unlinkSync(file.filepath); } catch {}
    }
  });
}

