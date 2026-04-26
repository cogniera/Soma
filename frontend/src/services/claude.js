export async function chat(messages) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) throw new Error(`Chat error ${res.status}`)
  const { text } = await res.json()
  return text
}

export async function triage(conversation) {
  const res = await fetch('/api/triage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation }),
  })
  if (!res.ok) throw new Error(`Triage error ${res.status}`)
  return res.json()
}

export async function anatomyNarration(bodyRegion, symptomSummary) {
  const res = await fetch('/api/narration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bodyRegion, symptomSummary }),
  })
  if (!res.ok) throw new Error(`Narration error ${res.status}`)
  const { text } = await res.json()
  return text
}
