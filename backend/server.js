import express from 'express'
import cors from 'cors'
import { GoogleGenAI } from '@google/genai'
import 'dotenv/config'

const app = express()
app.use(cors())
app.use(express.json())

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL = 'gemini-2.0-flash'
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'oEQ6y2Z3RRGa3doHtAB5'

const CHAT_SYSTEM = `You are Oso, a warm and compassionate AI health companion bear for SOMA — a health app that helps people understand their symptoms. You are caring, calm, and reassuring.

Your role: ask exactly one focused follow-up question per turn to gather more information about the user's symptoms. Keep responses to one or two sentences. Never diagnose. Never dismiss concerns. Always gently encourage seeking professional care for serious symptoms.`

const TRIAGE_SYSTEM = `You are a medical triage AI. Analyze the symptom conversation and return ONLY valid JSON — no markdown fences, no explanation, no extra text.

Return exactly this structure:
{
  "severity": <integer 1-5>,
  "redFlags": [<string>, ...],
  "bodyRegion": <string>,
  "summary": <string>
}

severity scale: 1=mild/self-care, 2=monitor closely, 3=see a doctor soon, 4=urgent care today, 5=emergency/call 911

bodyRegion must be exactly one of: head, neck, chest, abdomen, lower_back, upper_back, left_arm, right_arm, left_leg, right_leg

redFlags: list any alarm symptoms present (e.g. chest pain, difficulty breathing, sudden severe headache). Empty array if none.

summary: one sentence describing the patient's main complaint and context.`

const NARRATION_SYSTEM = `You are Oso, a warm and knowledgeable health companion bear. Write a short 2-3 sentence educational narration about the given body region in the context of the user's symptoms. Use plain, friendly language. Be reassuring but accurate. Do not diagnose. End with encouragement to consult a healthcare provider if symptoms persist.`

// Convert { role: 'user'|'assistant', content } → Gemini { role: 'user'|'model', parts }
function toGeminiContents(messages) {
  return messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
}

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'messages required' })

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: toGeminiContents(messages),
      config: { systemInstruction: CHAT_SYSTEM },
    })
    res.json({ text: response.text })
  } catch (err) {
    console.error('/api/chat error:', err.message)
    res.status(500).json({ error: 'Chat failed' })
  }
})

app.post('/api/triage', async (req, res) => {
  const { conversation } = req.body
  if (!conversation?.length) return res.status(400).json({ error: 'conversation required' })

  const transcript = conversation
    .map(m => `${m.role === 'user' ? 'Patient' : 'Oso'}: ${m.content}`)
    .join('\n')

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Symptom conversation:\n\n${transcript}`,
      config: {
        systemInstruction: TRIAGE_SYSTEM,
        responseMimeType: 'application/json',
      },
    })
    res.json(JSON.parse(response.text))
  } catch (err) {
    console.error('/api/triage error:', err.message)
    res.status(500).json({ error: 'Triage failed' })
  }
})

app.post('/api/narration', async (req, res) => {
  const { bodyRegion, symptomSummary } = req.body
  if (!bodyRegion) return res.status(400).json({ error: 'bodyRegion required' })

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Body region: ${bodyRegion}\nSymptom context: ${symptomSummary || 'general discomfort'}`,
      config: { systemInstruction: NARRATION_SYSTEM },
    })
    res.json({ text: response.text })
  } catch (err) {
    console.error('/api/narration error:', err.message)
    res.status(500).json({ error: 'Narration failed' })
  }
})

app.post('/api/speak', async (req, res) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'ElevenLabs not configured' })

  try {
    const elevRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    )

    if (!elevRes.ok) {
      const msg = await elevRes.text()
      console.error('ElevenLabs error:', elevRes.status, msg)
      return res.status(elevRes.status).json({ error: 'ElevenLabs request failed' })
    }

    
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Transfer-Encoding', 'chunked')
 
    const reader = elevRes.body.getReader()
    req.on('close', () => reader.cancel())
 
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (res.writableEnded) { reader.cancel(); break }
      res.write(Buffer.from(value))
    }
 
    res.end()
 
  } catch (err) {
    if (err.name === 'TimeoutError') {
      console.error('/api/speak: ElevenLabs timed out')
      if (!res.headersSent) res.status(504).json({ error: 'ElevenLabs timed out' })
    } else {
      console.error('/api/speak error:', err.message)
      if (!res.headersSent) res.status(500).json({ error: 'TTS failed' })
    }
  }
})