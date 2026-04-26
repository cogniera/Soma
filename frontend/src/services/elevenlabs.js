let currentAudio = null
let speakGen = 0  // incremented on every speak(); stale calls self-cancel

export function stopSpeaking() {
  speakGen++
  if (currentAudio) { currentAudio.pause(); currentAudio = null }
  window.speechSynthesis?.cancel()
}

export async function speak(text, { onStart, onEnd, onDuration } = {}) {
  const gen = ++speakGen
  if (currentAudio) { currentAudio.pause(); currentAudio = null }
  window.speechSynthesis?.cancel()

  const stale = () => gen !== speakGen

  try {
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (stale()) { onEnd?.(); return }

    if (res.ok) {
      const blob = await res.blob()
      if (stale()) { onEnd?.(); return }

      return new Promise((resolve) => {
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        currentAudio = audio

        audio.onloadedmetadata = () => onDuration?.(audio.duration)
        audio.onplay = () => onStart?.()

        audio.onended = () => {
          URL.revokeObjectURL(url)
          if (currentAudio === audio) currentAudio = null
          onEnd?.()
          resolve()
        }

        const handleFail = () => {
          URL.revokeObjectURL(url)
          if (currentAudio === audio) currentAudio = null
          if (!stale()) {
            browserSpeak(text, onStart, onEnd, resolve)
          } else {
            onEnd?.()
            resolve()
          }
        }

        audio.onerror = handleFail
        audio.play().catch(handleFail)
      })
    }
  } catch {
    // network error — fall through to browser TTS
  }

  if (stale()) { onEnd?.(); return }
  return browserSpeak(text, onStart, onEnd)
}

function browserSpeak(text, onStart, onEnd, externalResolve) {
  if (!window.speechSynthesis) {
    onStart?.(); onEnd?.(); externalResolve?.()
    return externalResolve ? undefined : Promise.resolve()
  }

  const run = (resolve) => {
    const utter = new SpeechSynthesisUtterance(text)

    const voices = window.speechSynthesis.getVoices()
    const preferred =
      voices.find(v => /samantha|karen|moira|daniel|google us|zira/i.test(v.name)) ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0]
    if (preferred) utter.voice = preferred

    utter.rate  = 0.95
    utter.pitch = 1.05

    utter.onstart = () => onStart?.()
    utter.onend   = () => { onEnd?.(); resolve() }
    utter.onerror = () => { onEnd?.(); resolve() }

    window.speechSynthesis.speak(utter)
  }

  if (externalResolve) { run(externalResolve) } else { return new Promise(run) }
}
