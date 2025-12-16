import Busboy from "busboy"
import OpenAI from "openai"
import fs from "fs"
import path from "path"
import crypto from "crypto"

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "https://personaqube.com")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
}

export const config = {
    api: {
        bodyParser: false,
    },
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
setCors(res)

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }
    if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Method not allowed" })
    }

    // 🔒 Disable ALL caching
    res.setHeader("Cache-Control", "no-store")

    const busboy = Busboy({ headers: req.headers })

    // ✅ UNIQUE per request
    const requestId = crypto.randomUUID()
    const tempDir = "/tmp"
    const tempFilePath = path.join(tempDir, `voice-${requestId}.webm`)

    let fileSaved = false

    busboy.on("file", (_, file) => {
        const writeStream = fs.createWriteStream(tempFilePath)
        file.pipe(writeStream)

        writeStream.on("close", () => {
            fileSaved = true
        })
    })

    busboy.on("finish", async () => {
        try {
            if (!fileSaved) {
                throw new Error("Audio file not saved")
            }

            // ----------------------------
            // TRANSCRIPTION (FRESH)
            // ----------------------------
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(tempFilePath),
                model: "gpt-4o-transcribe",
            })

            const transcript = transcription.text || ""

            // ----------------------------
            // SIMPLE METRICS (FRESH)
            // ----------------------------
            const wordCount = transcript.split(/\s+/).length
            const fillerMatches = transcript.match(/\b(um|uh|like|you know)\b/gi) || []

            const fillerRate =
                wordCount > 0 ? Math.min(fillerMatches.length / wordCount, 1) : 0

            const metrics = {
                clarity: 0.9,
                pacing: 0.85,
                energy: 0.8,
                fillerRate,
            }

            // ----------------------------
            // CONFIDENCE SCORE (FRESH)
            // ----------------------------
            const confidenceScore = Math.max(
                0,
                Math.round(
                    metrics.clarity * 40 +
                        metrics.pacing * 30 +
                        metrics.energy * 30 -
                        metrics.fillerRate * 100
                )
            )

            // ----------------------------
            // PERSONA FIT (FRESH)
            // ----------------------------
            const personaFit = {
                Leader: Math.max(0, confidenceScore),
                Trainer: Math.max(0, confidenceScore - 3),
                Coach: Math.max(0, confidenceScore + 4),
                Creator: Math.max(0, confidenceScore - 6),
            }

            // ----------------------------
            // CLEANUP
            // ----------------------------
            fs.unlinkSync(tempFilePath)

            return res.status(200).json({
                ok: true,
                transcript,
                metrics,
                confidenceScore,
                personaFit,
            })
        } catch (err) {
            return res.status(500).json({
                ok: false,
                error: err.message || "Transcription failed",
            })
        }
    })

    req.pipe(busboy)
}

