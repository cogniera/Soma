let currentUtterance = null

export function stopSpeaking() {
  window.speechSynthesis?.cancel()
  currentUtterance = null
}

export async function speak(text, { onStart, onEnd } = {}) {
  stopSpeaking()
  if (!window.speechSynthesis) { onStart?.(); onEnd?.(); return }

  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text)
    currentUtterance = utter

    // Pick a pleasant voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v =>
      /samantha|karen|moira|daniel|google us|zira/i.test(v.name)
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0]
    if (preferred) utter.voice = preferred

    utter.rate  = 0.95
    utter.pitch = 1.05

    utter.onstart = () => onStart?.()
    utter.onend   = () => { currentUtterance = null; onEnd?.(); resolve() }
    utter.onerror = () => { currentUtterance = null; onEnd?.(); resolve() }

    window.speechSynthesis.speak(utter)
  })
}
