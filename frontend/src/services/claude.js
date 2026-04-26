const API = import.meta.env.VITE_API_URL ?? ''

export async function chat(messages) {
  const res = await fetch(`${API}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) throw new Error(`Chat error ${res.status}`)
  const { text } = await res.json()
  return text
}

export async function triage(conversation) {
  const res = await fetch(`${API}/api/triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation }),
  })
  if (!res.ok) throw new Error(`Triage error ${res.status}`)
  return res.json()
}

export async function muscleStory(symptomText) {
  const res = await fetch(`${API}/api/muscle-story`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symptomText }),
  })
  if (!res.ok) throw new Error(`Muscle story error ${res.status}`)
  const { story } = await res.json()
  return story
}

export async function muscleFocus(text) {
  const res = await fetch(`${API}/api/muscle-focus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) return null
  const { muscle } = await res.json()
  return muscle
}

export async function anatomyNarration(bodyRegion, symptomSummary) {
  const res = await fetch(`${API}/api/narration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bodyRegion, symptomSummary }),
  })
  if (!res.ok) throw new Error(`Narration error ${res.status}`)
  const { text } = await res.json()
  return text
}
