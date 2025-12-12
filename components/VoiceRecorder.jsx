// components/VoiceRecorder.jsx
import React, { useRef, useState } from "react"

export default function VoiceRecorder({ apiUrl = "/api/transcribe", maxDuration = 12 }) {
  const [recording, setRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const startTimeRef = useRef(0)
  const endTimeRef = useRef(0)

  async function startRecording() {
    setResult(null)
    audioChunksRef.current = []
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const source = audioCtx.createMediaStreamSource(stream)
    analyserRef.current = audioCtx.createAnalyser()
    analyserRef.current.fftSize = 2048
    source.connect(analyserRef.current)
    dataArrayRef.current = new Float32Array(analyserRef.current.fftSize)

    drawWaveform()

    const options = { mimeType: "audio/webm" }
    const mr = new MediaRecorder(stream, options)
    mediaRecorderRef.current = mr

    mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data) }
    mr.onstart = () => { startTimeRef.current = performance.now(); setRecording(true) }

    mr.onstop = async () => {
      endTimeRef.current = performance.now()
      setRecording(false)
      cancelAnimationFrame(rafRef.current)
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
      const arrayBuffer = await blob.arrayBuffer()
      const features = await computeAudioFeatures(arrayBuffer)
      setIsUploading(true)
      try {
        const form = new FormData()
        form.append("file", new File([blob], "sample.webm", { type: "audio/webm" }))
        const res = await fetch(apiUrl, { method: "POST", body: form })
        const data = await res.json()
        if (!data.ok) throw new Error(data.message || "Transcription failed")
        const transcript = data.transcript
        const durationSec = (endTimeRef.current - startTimeRef.current) / 1000
        const scoring = computeScore(transcript, features, durationSec)
        setResult({ transcript, features, scoring, durationSec })
      } catch (err) {
        setResult({ error: String(err) })
      } finally {
        setIsUploading(false)
      }
    }

    mr.start()
    setTimeout(() => { if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") mediaRecorderRef.current.stop() }, maxDuration * 1000)
  }

  function stopRecording() { if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") mediaRecorderRef.current.stop() }

  function drawWaveform() {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) { rafRef.current = requestAnimationFrame(drawWaveform); return }
    const ctx = canvas.getContext("2d")
    const w = canvas.width = canvas.offsetWidth
    const h = canvas.height = canvas.offsetHeight
    analyser.getFloatTimeDomainData(dataArrayRef.current)
    ctx.clearRect(0, 0, w, h)
    ctx.lineWidth = 1.5
    ctx.strokeStyle = "#00D1FF"
    ctx.beginPath()
    const step = Math.max(1, Math.floor(dataArrayRef.current.length / w))
    let x = 0
    for (let i = 0; i < w; i++) {
      const v = dataArrayRef.current[i * step] || 0
      const y = (1 + v) * h / 2
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      x += 1
    }
    ctx.stroke()
    rafRef.current = requestAnimationFrame(drawWaveform)
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={startRecording} disabled={recording} style={{ padding: "10px 14px", borderRadius: 10, background: "#00D1FF", border: "none", fontWeight: 700 }}>
          {recording ? "Recording…" : "Start Recording"}
        </button>
        <button onClick={stopRecording} disabled={!recording} style={{ padding: "8px 12px", borderRadius: 8 }}>Stop</button>
        {isUploading && <div style={{ marginLeft: 8 }}>Uploading & transcribing…</div>}
      </div>

      <div style={{ marginTop: 18 }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: 84, background: "linear-gradient(90deg,#02101E,#021B2A)" }} />
      </div>

      {result && (
        <div style={{ marginTop: 18, background: "#fff", padding: 16, borderRadius: 12 }}>
          {result.error ? (
            <div style={{ color: "red" }}>{result.error}</div>
          ) : (
            <>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Confidence Score — {result.scoring.confidence}</div>
              <div style={{ marginTop: 10 }}><strong>Transcript</strong>: {result.transcript}</div>
              <div style={{ marginTop: 10 }}><strong>Feedback</strong>:
                <ul>{result.scoring.feedback.map((f,i)=>(<li key={i}>{f}</li>))}</ul>
              </div>
              <div style={{ marginTop: 10 }}><strong>Persona fit</strong>:
                <ul>{Object.entries(result.scoring.personaFit).map(([k,v])=>(<li key={k}>{k}: {v}</li>))}</ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* Simple audio features + scoring */
async function computeAudioFeatures(arrayBuffer) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0))
  const chan = decoded.getChannelData(0)
  const sampleRate = decoded.sampleRate
  let sum = 0
  for (let i = 0; i < chan.length; i++) sum += chan[i] * chan[i]
  const rms = Math.sqrt(sum / chan.length)
  const frameSize = Math.floor(sampleRate * 0.03)
  let silentFrames = 0, totalFrames = 0
  const silenceThreshold = 0.01
  for (let i = 0; i < chan.length; i += frameSize) {
    totalFrames++
    let max = 0
    for (let j = i; j < i + frameSize && j < chan.length; j++) max = Math.max(max, Math.abs(chan[j]))
    if (max < silenceThreshold) silentFrames++
  }
  const silenceRatio = silentFrames / totalFrames
  function autoCorrelate(buf, sr) {
    const N = Math.min(buf.length, Math.floor(sr * 0.5))
    const start = Math.floor((buf.length - N) / 2)
    const x = buf.slice(start, start + N)
    const rmsVal = Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length)
    if (rmsVal < 0.01) return 0
    let bestOffset = -1, bestCorr = 0
    const maxOffset = Math.floor(sr / 50)
    for (let offset = 20; offset < maxOffset; offset++) {
      let corr = 0
      for (let i = 0; i < N - offset; i++) corr += x[i] * x[i + offset]
      if (corr > bestCorr) { bestCorr = corr; bestOffset = offset }
    }
    if (bestOffset <= 0) return 0
    return sr / bestOffset
  }
  const pitchHz = autoCorrelate(chan, sampleRate)
  return { rms, silenceRatio, pitchHz, duration: decoded.duration, sampleRate }
}

function computeScore(transcript, features, durationSec) {
  const text = (transcript || "").trim()
  const words = text ? text.split(/\s+/).length : 0
  const wpm = durationSec > 0 ? (words / durationSec) * 60 : 0
  const fillerRegex = /\b(um|uh|like|you know|so|actually|basically|right)\b/gi
  const fillerMatches = (text.match(fillerRegex) || []).length
  let score = 100
  if (wpm < 100) score -= Math.round((100 - wpm) * 0.3)
  if (wpm > 170) score -= Math.round((wpm - 170) * 0.25)
  score -= fillerMatches * 4
  score -= Math.round(features.silenceRatio * 100 * 0.4)
  if (features.pitchHz && features.pitchHz > 350) score -= 4
  if (features.pitchHz && features.pitchHz < 80 && features.pitchHz > 0) score -= 2
  if (features.rms < 0.01) score -= 8
  score = Math.max(20, Math.min(98, Math.round(score)))
  const personaFit = computePersonaFit(wpm, features, fillerMatches)
  const feedback = []
  if (wpm > 170) feedback.push("Your pace is slightly fast — try slowing down by ~8–12%")
  else if (wpm < 100) feedback.push("Try increasing your pace by ~8–12% to sound more decisive")
  if (fillerMatches > 0) feedback.push(`Reduce filler words (you used ${fillerMatches}). Pause instead.`)
  if (features.silenceRatio > 0.30) feedback.push("Pauses are frequent — aim for fewer, purposeful pauses")
  if (features.rms < 0.01) feedback.push("Increase vocal energy — project from the diaphragm")
  if (feedback.length < 3) { if (features.pitchHz && features.pitchHz < 120) feedback.push("Lower pitch slightly to sound more authoritative") else feedback.push("Add small pauses before important phrases to emphasize them") }
  return { confidence: score, personaFit, feedback: feedback.slice(0,3), raw: { wpm, fillerMatches, features } }
}
function computePersonaFit(wpm, features, fillerMatches) {
  const templates = { Leader:{targetWpm:110,pitchHz:120,fillerPenalty:2}, Coach:{targetWpm:150,pitchHz:200,fillerPenalty:3}, Trainer:{targetWpm:130,pitchHz:150,fillerPenalty:2}, Creator:{targetWpm:150,pitchHz:220,fillerPenalty:4} }
  const fit = {}
  for (const [key,t] of Object.entries(templates)) {
    let score = 100
    score -= Math.abs(wpm - t.targetWpm) * 0.2
    if (features.pitchHz && t.pitchHz) score -= Math.abs(features.pitchHz - t.pitchHz) * 0.02
    score -= fillerMatches * t.fillerPenalty
    fit[key] = Math.max(10, Math.round(score))
  }
  return fit
}
