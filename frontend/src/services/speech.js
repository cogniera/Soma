const SR = window.SpeechRecognition || window.webkitSpeechRecognition

export const isSupported = () => !!SR

export function startListening({ onInterim, onFinal, onError } = {}) {
  if (!SR) { onError?.('not-supported'); return () => {} }

  const rec = new SR()
  rec.lang = 'en-US'
  rec.continuous = false
  rec.interimResults = true

  rec.onresult = (e) => {
    let interim = '', final = ''
    for (const r of e.results) {
      r.isFinal ? (final += r[0].transcript) : (interim += r[0].transcript)
    }
    if (interim) onInterim?.(interim)
    if (final)   onFinal?.(final)
  }

  rec.onerror = (e) => onError?.(e.error)

  rec.start()
  return () => rec.stop()
}
