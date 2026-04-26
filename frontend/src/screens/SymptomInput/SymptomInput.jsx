import { useState, useRef } from 'react'
import VoiceButton from '../../components/VoiceButton/VoiceButton'

const QUICK_PICKS = [
  'Lower back', 'Shoulders', 'Quads',
  'Hamstrings', 'Chest', 'Neck',
]

export default function SymptomInput({ onSubmit, onVisual }) {
  const [text, setText]           = useState('')
  const [interimText, setInterim] = useState('')
  const textareaRef               = useRef(null)

  const submit = () => {
    const val = text.trim()
    if (!val) return
    onSubmit(val)
  }

  const handleChip = (chip) => {
    setText(prev => (prev === chip ? '' : chip))
    textareaRef.current?.focus()
  }

  return (
    <div className="screen symptom-screen">
      <p className="chat-eyebrow">
        <span className="eyebrow-dot" />
        SOMA · Muscle Educator
      </p>

      <h2 className="screen-heading">
        What would you like<br />
        <em className="accent">to explore?</em>
      </h2>

      <p className="screen-sub">
        Tell me which muscles or movements you're curious about — I'll walk you through them.
      </p>

      <div className="quick-picks">
        {QUICK_PICKS.map(q => (
          <button
            key={q}
            className={`qp-chip${text === q ? ' qp-chip--on' : ''}`}
            onClick={() => handleChip(q)}
            aria-pressed={text === q}
          >
            {q}
          </button>
        ))}
      </div>

      <div className="input-row">
        <textarea
          ref={textareaRef}
          className="chat-input"
          rows={3}
          placeholder={interimText || 'e.g. How do my glutes help me run?'}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          aria-label="Describe what you want to learn"
        />
        <VoiceButton
          onInterim={setInterim}
          onFinal={t => { setText(t); setInterim('') }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="cta-btn" onClick={submit} disabled={!text.trim()}>
          Chat with Oso
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M3 9h12M11 5l4 4-4 4" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button className="outline-btn" onClick={() => { const val = text.trim(); if (val) onVisual(val) }} disabled={!text.trim()}>
          Visualize
        </button>
      </div>
    </div>
  )
}
