import { useState, useRef, useEffect } from 'react'
import { startListening, isSupported } from '../../services/speech'

export default function VoiceButton({ onInterim, onFinal, disabled }) {
  const [state, setState] = useState('idle') // idle | recording
  const stopRef = useRef(null)

  useEffect(() => () => stopRef.current?.(), [])

  if (!isSupported()) return null

  const toggle = () => {
    if (state === 'recording') {
      stopRef.current?.()
      setState('idle')
      return
    }

    setState('recording')
    stopRef.current = startListening({
      onInterim,
      onFinal: (t) => {
        onFinal?.(t)
        setState('idle')
      },
      onError: () => setState('idle'),
    })
  }

  return (
    <button
      className={`voice-btn${state === 'recording' ? ' voice-btn--on' : ''}`}
      onClick={toggle}
      disabled={disabled}
      aria-label={state === 'recording' ? 'Stop recording' : 'Speak your symptom'}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        {state === 'recording' ? (
          <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
        ) : (
          <>
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"
              stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v3M8 22h8"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>
    </button>
  )
}
