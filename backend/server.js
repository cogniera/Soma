import express from 'express'
import cors from 'cors'
import { GoogleGenAI } from '@google/genai'
import 'dotenv/config'

const app = express()
app.use(cors())
app.use(express.json())

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL = 'gemini-2.0-flash'
const GEMMA_MODEL = 'gemma-3-27b-it'
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'oEQ6y2Z3RRGa3doHtAB5'

// Muscles available in the 3D model, grouped by region. Gemma must pick from
// these EXACT names (the underscore form is what maps to the model meshes).
const MUSCLE_GROUPS = [
  { region: 'Head & Neck', muscles: [
    { name: 'Face',         desc: 'facial muscles' },
    { name: 'Eye_muscles',  desc: 'extraocular eye muscles' },
    { name: 'Neck',         desc: 'cervical / neck muscles' },
    { name: 'Upper_Trap',   desc: 'upper trapezius — the thick part running up to the neck' },
    { name: 'Lower_Trap',   desc: 'lower trapezius — the wide part across the upper back' },
  ]},
  { region: 'Torso', muscles: [
    { name: 'Chest',        desc: 'pectorals' },
    { name: 'Core',         desc: 'rectus abdominis / abs' },
    { name: 'Obliques',     desc: 'sides of the stomach' },
    { name: 'Back',         desc: 'lats and spinal erectors' },
  ]},
  { region: 'Shoulders', muscles: [
    { name: 'Front_Delt',   desc: 'anterior deltoid' },
    { name: 'Side_Delt',    desc: 'lateral deltoid' },
    { name: 'Rear_Delt',    desc: 'posterior deltoid' },
  ]},
  { region: 'Arms', muscles: [
    { name: 'Arms',         desc: 'biceps and triceps — the full upper arm' },
    { name: 'Forearm',      desc: 'forearm flexors and extensors' },
    { name: 'Hand',         desc: 'intrinsic hand muscles' },
  ]},
  { region: 'Hips & Glutes', muscles: [
    { name: 'Glutes_Hip',   desc: 'glutes, piriformis, and hip flexors' },
  ]},
  { region: 'Upper Leg', muscles: [
    { name: 'Quads',        desc: 'quadriceps and inner thigh — front and inner thigh' },
    { name: 'Hamstrings',   desc: 'hamstrings — back of the thigh' },
    { name: 'IT_Band',      desc: 'iliotibial band — lateral side of the thigh' },
  ]},
  { region: 'Lower Leg & Foot', muscles: [
    { name: 'Lower_leg',    desc: 'calves and tibialis' },
    { name: 'Foot',         desc: 'foot muscles' },
  ]},
]

const MUSCLE_LIST = MUSCLE_GROUPS.flatMap(g => g.muscles.map(m => m.name))

const MUSCLE_CATALOG = MUSCLE_GROUPS
  .map(g => `${g.region}:\n${g.muscles.map(m => `  - ${m.name} (${m.desc})`).join('\n')}`)
  .join('\n\n')

const CHAT_SYSTEM = `You are Oso, a friendly and knowledgeable muscle educator bear for SOMA — an app that helps people understand how their muscles work. You are warm, curious, and enthusiastic about anatomy.

Your role: engage the user in an educational conversation about the muscles relevant to what they describe. Ask exactly one focused follow-up question per turn to better understand which muscles or movements they want to learn about. Keep responses to one or two sentences. Focus on education — explain how muscles function, interact, and move. Never diagnose or give medical advice.

You may ONLY reference muscles from this list. Do not mention any muscle not on this list:

${MUSCLE_CATALOG}`

const TRIAGE_SYSTEM = `You are a muscle anatomy analyst. Analyze the conversation and return ONLY valid JSON — no markdown fences, no explanation, no extra text.

Return exactly this structure:
{
  "severity": <integer 1-5>,
  "redFlags": [<string>, ...],
  "bodyRegion": <string>,
  "summary": <string>
}

severity scale: 1=general curiosity, 2=mild discomfort, 3=moderate concern, 4=significant issue, 5=seek professional help

bodyRegion must be exactly one of: head, neck, chest, abdomen, lower_back, upper_back, left_arm, right_arm, left_leg, right_leg

redFlags: list any serious concerns mentioned. Empty array if none.

summary: one sentence describing which muscles or area the user wants to understand.`

const NARRATION_SYSTEM = `You are Oso, a friendly muscle educator bear. Write a short 2-3 sentence educational narration about the muscles in the given body region relevant to the user's interest. Use plain, enthusiastic language. Focus on how those muscles work, what movements they enable, and why they matter. Keep it engaging and educational.`

const sanitize = (text) => text.replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim()

// Convert { role: 'user'|'assistant', content } → Gemini { role: 'user'|'model', parts }
// Gemma doesn't support systemInstruction, so prepend it to the first user message.
function toGeminiContents(messages, systemPrompt) {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  if (systemPrompt && contents.length > 0 && contents[0].role === 'user') {
    contents[0].parts[0].text = `${systemPrompt}\n\n${contents[0].parts[0].text}`
  }
  return contents
}

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'messages required' })

  try {
    const response = await ai.models.generateContent({
      model: GEMMA_MODEL,
      contents: toGeminiContents(messages, CHAT_SYSTEM),
    })
    res.json({ text: sanitize(response.text) })
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
      model: GEMMA_MODEL,
      contents: `${TRIAGE_SYSTEM}\n\nSymptom conversation:\n\n${transcript}`,
    })
    const parsed = JSON.parse(response.text)
    if (parsed.summary) parsed.summary = sanitize(parsed.summary)
    res.json(parsed)
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
      model: GEMMA_MODEL,
      contents: `${NARRATION_SYSTEM}\n\nBody region: ${bodyRegion}\nSymptom context: ${symptomSummary || 'general discomfort'}`,
    })
    res.json({ text: sanitize(response.text) })
  } catch (err) {
    console.error('/api/narration error:', err.message)
    res.status(500).json({ error: 'Narration failed' })
  }
})

app.post('/api/muscle-story', async (req, res) => {
  const { symptomText } = req.body
  if (!symptomText) return res.status(400).json({ error: 'symptomText required' })

  const prompt = `You are a knowledgeable, friendly anatomy guide. A user described this concern:

"${symptomText}"

Pick the muscles most relevant to that concern from the list below, and walk through them one at a time as a single coherent educational story. Order them so the explanation flows naturally — proximal to distal, cause to effect, or by anatomical chain — and have each muscle's narration build on the one before it.

Allowed muscle names — use these EXACT spellings (case-sensitive, with underscores). Do not invent new ones, do not change capitalization, do not replace underscores with spaces. The parenthetical descriptions are only to help you choose; the JSON "muscle" field MUST be the exact name on the left:

${MUSCLE_CATALOG}

Pick between 3 and 7 muscles. Return ONLY a valid JSON array — no prose, no markdown fences, no commentary — with this exact shape:

[
  { "muscle": "<one of the names above>", "script": "<2-3 sentences spoken aloud, tying this muscle to the user's concern and continuing the story>", "index": <1-based position in the story> }
]

CRITICAL: the "muscle" field uses the underscored identifier (e.g. "Upper_Trap"), but the "script" field is read aloud by a text-to-speech voice — it MUST be natural English. Never include underscored identifiers like "Upper_Trap" or "Eye_muscles" in the script; write "upper trapezius" or "the muscles around your eyes" instead. Underscores are only allowed in the "muscle" field.`

  try {
    const response = await ai.models.generateContent({
      model: GEMMA_MODEL,
      contents: prompt,
    })

    let text = (response.text ?? '').trim()
    // Strip ```json fences if Gemma wraps the array
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    }
    // If Gemma added prose, grab the first JSON array
    const arrMatch = text.match(/\[[\s\S]*\]/)
    if (arrMatch) text = arrMatch[0]

    const parsed = JSON.parse(text)
    const muscleSet = new Set(MUSCLE_LIST)

    // Replace any underscored muscle identifier that leaked into the spoken
    // script with its space-separated form (e.g. "Upper_Trap" → "Upper Trap").
    const cleanScript = (raw) => {
      let out = raw
      for (const name of MUSCLE_LIST) {
        if (!name.includes('_')) continue
        out = out.replaceAll(name, name.replaceAll('_', ' '))
      }
      return out
    }

    const story = (Array.isArray(parsed) ? parsed : [])
      .filter(s => s && muscleSet.has(s.muscle) && typeof s.script === 'string')
      .map((s, i) => ({
        muscle: s.muscle,
        script: cleanScript(s.script),
        index: Number.isInteger(s.index) ? s.index : i + 1,
      }))
      .sort((a, b) => a.index - b.index)

    res.json({ story })
  } catch (err) {
    console.error('/api/muscle-story error:', err.message)
    res.status(500).json({ error: 'Muscle story failed' })
  }
})

app.post('/api/muscle-focus', async (req, res) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })

  const prompt = `You are a muscle identifier. Given a sentence about muscles or anatomy, return ONLY the single most relevant muscle name from this list — no explanation, no punctuation, just the name exactly as written:

${MUSCLE_LIST.join(', ')}

If no muscle is clearly relevant, return the string "null".

Sentence: "${text}"`

  try {
    const response = await ai.models.generateContent({
      model: GEMMA_MODEL,
      contents: prompt,
    })
    const raw = (response.text ?? '').trim().replace(/[^a-zA-Z_]/g, '')
    const muscle = MUSCLE_LIST.includes(raw) ? raw : null
    res.json({ muscle })
  } catch (err) {
    console.error('/api/muscle-focus error:', err.message)
    res.json({ muscle: null })
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

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Soma backend listening on http://localhost:${PORT}`)
})