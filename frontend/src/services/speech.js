const SR = window.SpeechRecognition || window.webkitSpeechRecognition

export const isSupported = () => !!SR

export function startListening({ onInterim, onFinal, onError } = {}) {
  if (!SR) { onError?.('not-supported'); return () => {} }

  let accumulated  = ''
  let explicitStop = false
  let restarts     = 0
  let currentRec   = null
  const MAX_RESTARTS = 3

  function start() {
    const rec = new SR()
    rec.lang           = 'en-US'
    rec.continuous     = true
    rec.interimResults = true
    currentRec = rec

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) {
          accumulated += r[0].transcript + ' '
        } else {
          interim += r[0].transcript
        }
      }
      onInterim?.(accumulated + interim)
    }

    rec.onerror = (e) => {
      if (e.error !== 'no-speech') onError?.(e.error)
    }

    rec.onend = () => {
      if (explicitStop) {
        const text = accumulated.trim()
        if (text) onFinal?.(text)
        return
      }

      const text = accumulated.trim()
      if (text) {
        // Captured something — deliver it
        onFinal?.(text)
      } else if (restarts < MAX_RESTARTS) {
        // Nothing yet — restart silently to keep the mic alive
        restarts++
        try { start() } catch { onError?.('ended') }
      } else {
        onError?.('ended')
      }
    }

    try { rec.start() } catch { onError?.('ended') }
  }

  start()

  return () => {
    explicitStop = true
    try { currentRec?.stop() } catch { /* already stopped */ }
  }
}
