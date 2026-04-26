import { useState, useRef } from 'react'
import VoiceButton from '../../components/VoiceButton/VoiceButton'

const QUICK_PICKS = [
  'Headache', 'Back pain', 'Stomach ache',
  'Chest tightness', 'Joint pain', 'Fatigue',
]

export default function SymptomInput({ onSubmit }) {
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
        SOMA · AI Companion
      </p>

      <h2 className="screen-heading">
        What's bothering<br />
        <em className="accent">you today?</em>
      </h2>

      <p className="screen-sub">
        Tell me what you're feeling - I'll help you understand your body.
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
          placeholder={interimText || 'Or describe it in your own words…'}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          aria-label="Describe your symptoms"
        />
        <VoiceButton
          onInterim={setInterim}
          onFinal={t => { setText(t); setInterim('') }}
        />
      </div>

      <button className="cta-btn" onClick={submit} disabled={!text.trim()}>
        Talk to SOMA
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path d="M3 9h12M11 5l4 4-4 4" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
