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

    res.setHeader("Cache-Control", "no-store")

    const requestId = crypto.randomUUID()
    const tempFilePath = path.join("/tmp", `voice-${requestId}.webm`)

    let writePromise

    const busboy = Busboy({ headers: req.headers })

    busboy.on("file", (_, file) => {
        const writeStream = fs.createWriteStream(tempFilePath)
        file.pipe(writeStream)

        writePromise = new Promise((resolve, reject) => {
            writeStream.on("finish", resolve)
            writeStream.on("error", reject)
        })
    })

    busboy.on("finish", async () => {
        try {
            // ✅ WAIT until file is actually written
            await writePromise

            // ----------------------------
            // TRANSCRIPTION
            // ----------------------------
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(tempFilePath),
                model: "gpt-4o-transcribe",
            })

            const transcript = transcription.text || ""

            // ----------------------------
            // METRICS
            // ----------------------------
            const words = transcript.split(/\s+/).filter(Boolean)
            const fillerMatches =
                transcript.match(/\b(um|uh|like|you know)\b/gi) || []

            const fillerRate =
                words.length > 0
                    ? Math.min(fillerMatches.length / words.length, 1)
                    : 0

            const metrics = {
                clarity: 0.9,
                pacing: 0.85,
                energy: 0.8,
                fillerRate,
            }

            // ----------------------------
            // CONFIDENCE SCORE
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
            // PERSONA FIT
            // ----------------------------
            const personaFit = {
                Leader: confidenceScore,
                Trainer: Math.max(0, confidenceScore - 3),
                Coach: Math.max(0, confidenceScore + 4),
                Creator: Math.max(0, confidenceScore - 6),
            }

            // Cleanup
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
                error: err.message || "Processing failed",
            })
        }
    })

    req.pipe(busboy)
}

