// pages/api/transcribe.js

import Busboy from "busboy"
import { computeConfidence, computePersonaFit } from "../../lib/voiceScoring"

export const config = {
  api: { bodyParser: false },
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
}

export default async function handler(req, res) {
  setCors(res)

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const audioChunks = []
    let fileReceived = false

    await new Promise((resolve, reject) => {
      const busboy = Busboy({
        headers: req.headers,
        limits: { files: 1 },
      })

      busboy.on("file", (name, file) => {
        fileReceived = true

        file.on("data", (data) => {
          audioChunks.push(data)
        })

        file.on("end", () => {
          // important: allow finish to fire
        })
      })

      busboy.on("finish", resolve)
      busboy.on("error", reject)

      req.pipe(busboy)
    })

    if (!fileReceived || audioChunks.length === 0) {
      return res.status(400).json({ error: "No audio received" })
    }

    // =============================
    // PHASE 2.1 – SCORING LOGIC
    // =============================

    const transcript =
      "Hi everyone, this is Ravi here. I am excited to record my voice."

    const metrics = {
      clarity: 0.9,
      pacing: 0.85,
      energy: 0.8,
      fillerRate: 0.15,
    }

    const confidenceScore = computeConfidence(metrics)
    const personaFit = computePersonaFit(metrics)

    return res.status(200).json({
      transcript,
      metrics,
      confidenceScore,
      personaFit,
    })
  } catch (err) {
    console.error("Transcribe error:", err)
    return res.status(500).json({ error: "Analysis failed" })
  }
}

