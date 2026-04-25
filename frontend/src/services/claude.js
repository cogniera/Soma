// Pure frontend mock — no API keys yet

const QNA_QUESTIONS = [
  "Can you tell me exactly where you're feeling it and how long it's been going on?",
  "On a scale of 1 to 10, how would you rate the pain or discomfort?",
  "Have you noticed anything that makes it better or worse?",
  "Do you have any other symptoms like fever, nausea, or dizziness?",
]

export async function chat(messages) {
  // Return the next scripted question based on how many assistant turns have happened
  const assistantTurns = messages.filter(m => m.role === 'assistant').length
  await delay(600)
  return QNA_QUESTIONS[assistantTurns] ?? "Thank you for sharing all of that — I have a clear picture now. Let me assess what might be going on."
}

// Keyword → body region mapping
const REGION_KEYWORDS = {
  head:       ['head', 'migraine', 'headache', 'skull', 'temple', 'forehead', 'scalp'],
  neck:       ['neck', 'throat', 'cervical', 'swallow'],
  chest:      ['chest', 'heart', 'cardiac', 'palpitation', 'lung', 'breathing', 'breath', 'rib'],
  abdomen:    ['stomach', 'abdomen', 'belly', 'abdominal', 'nausea', 'bowel', 'gut', 'bloat', 'digest'],
  lower_back: ['lower back', 'lumbar', 'back pain', 'spine', 'sciatic', 'hip', 'tailbone'],
  upper_back: ['upper back', 'shoulder blade', 'thoracic', 'between shoulder'],
  left_arm:   ['left arm', 'left shoulder', 'left elbow', 'left wrist', 'left hand'],
  right_arm:  ['right arm', 'right shoulder', 'right elbow', 'right wrist', 'right hand'],
  left_leg:   ['left leg', 'left knee', 'left ankle', 'left foot', 'left thigh', 'left calf'],
  right_leg:  ['right leg', 'right knee', 'right ankle', 'right foot', 'right thigh', 'right calf'],
}

const RED_FLAG_KEYWORDS = [
  'chest pain', 'shortness of breath', 'can\'t breathe', 'stroke', 'sudden headache',
  'uncontrolled bleeding', 'unconscious', 'seizure', 'heart attack', 'crushing',
  'radiates to arm', 'left arm pain', 'facial droop', 'slurred speech',
]

function extractText(conversation) {
  return conversation.map(m => m.content).join(' ').toLowerCase()
}

function guessRegion(text) {
  for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) return region
  }
  return 'lower_back'
}

function guessSeverity(text, redFlags) {
  if (redFlags.length >= 2) return 5
  if (redFlags.length === 1) return 4
  if (/severe|unbearable|worst|10.?out|excruciating|crushing/.test(text)) return 4
  if (/sharp|8|9|intense|terrible|awful/.test(text)) return 3
  if (/moderate|7|6|5|uncomfortable|aching|throbbing/.test(text)) return 2
  return 2
}

export async function triage(conversation) {
  await delay(900)
  const text = extractText(conversation)
  const redFlags = RED_FLAG_KEYWORDS.filter(kw => text.includes(kw))
  const bodyRegion = guessRegion(text)
  const severity = guessSeverity(text, redFlags)

  // Build a one-sentence summary from the first user message
  const firstUserMsg = conversation.find(m => m.role === 'user')?.content ?? 'symptoms described'
  const summary = firstUserMsg.length > 80
    ? firstUserMsg.slice(0, 77) + '…'
    : firstUserMsg

  return { severity, redFlags, bodyRegion, summary }
}

const NARRATIONS = {
  head:       "The head houses your brain, which controls everything your body does. Headaches and head pain can stem from tension in the scalp muscles, blood vessel changes, or pressure. Staying hydrated and managing stress are great first steps — and a healthcare provider can help if they're recurring.",
  neck:       "Your neck supports your head and protects the spinal cord that runs through it. Neck pain often comes from muscle tension, poor posture, or sleeping at an awkward angle. Gentle stretches and heat can help — see a doctor if you have numbness or tingling down your arm.",
  chest:      "The chest contains your heart and lungs, which work together to keep oxygen moving through your body. Chest discomfort can come from many sources — muscle strain, acid reflux, or respiratory issues. If you ever feel pressure, tightness, or pain that spreads to your arm or jaw, seek care right away.",
  abdomen:    "Your abdomen houses your digestive system — stomach, intestines, liver, and more. Discomfort here can come from digestion, gas, muscle strain, or inflammation. Eating smaller meals and staying hydrated often helps; persistent or severe pain deserves a checkup.",
  lower_back: "The lower back supports most of your body's weight and is one of the most common areas for discomfort. The lumbar spine, muscles, and discs work together to keep you upright and moving. Gentle movement, good posture, and core strengthening are key — most lower back pain improves within a few weeks.",
  upper_back: "The upper back and shoulder blade area is supported by a complex network of muscles attached to your thoracic spine. Pain here is often related to posture, prolonged sitting, or muscle overuse. Shoulder rolls, stretching, and ergonomic adjustments can make a big difference.",
  left_arm:   "The left arm's muscles, tendons, and joints can be strained by repetitive movement, overuse, or injury. Pain that radiates from the shoulder down the arm can sometimes relate to neck or nerve issues. Rest and gentle movement usually help, but persistent arm pain warrants a professional evaluation.",
  right_arm:  "The right arm is used in most daily tasks, making it prone to overuse and repetitive strain. Discomfort in the shoulder, elbow (tennis elbow), or wrist (carpal tunnel) are common culprits. Ice, rest, and gentle stretching are your friends — a physio can help with persistent issues.",
  left_leg:   "Your left leg's network of muscles, tendons, and joints handles tremendous load every day. Pain can arise from the hip, knee, or ankle, or from nerve compression like sciatica. Keeping muscles strong and flexible is the best prevention — a healthcare provider can pinpoint the source.",
  right_leg:  "The right leg bears constant stress from walking, standing, and exercise. Common issues include knee strain, shin splints, and ankle sprains. RICE (rest, ice, compression, elevation) works well for acute injuries — see a professional if the pain limits your daily movement.",
}

export async function anatomyNarration(bodyRegion) {
  await delay(500)
  return NARRATIONS[bodyRegion] ?? NARRATIONS.lower_back
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms))
}
