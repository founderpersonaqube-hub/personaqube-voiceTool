// pages/api/transcribe.js

import Busboy from "busboy"
import { computeConfidence, computePersonaFit } from "../../lib/voiceScoring"

export const config = {
  api: { bodyParser: false },
}

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(payload))
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
}

export default async function handler(req, res) {
  setCors(res)

  // ✅ Handle preflight cleanly
  if (req.method === "OPTIONS") {
    return json(res, 200, { ok: true })
  }

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed" })
  }

  try {
    const audioChunks = []
    let fileFound = false

    await new Promise((resolve, reject) => {
      const busboy = Busboy({
        headers: req.headers,
        limits: { files: 1 },
      })

      busboy.on("file", (_, file) => {
        fileFound = true
        file.on("data", (d) => audioChunks.push(d))
      })

      busboy.on("finish", resolve)
      busboy.on("error", reject)

      req.pipe(busboy)
    })

    if (!fileFound || audioChunks.length === 0) {
      return json(res, 400, {
        ok: false,
        error: "No audio received",
      })
    }

    // ===== PHASE 2.1 SAFE PLACEHOLDER =====
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

    return json(res, 200, {
      ok: true,
      transcript,
      metrics,
      confidenceScore,
      personaFit,
    })
  } catch (err) {
    return json(res, 500, {
      ok: false,
      error: err?.message || "Analysis failed",
    })
  }
}

