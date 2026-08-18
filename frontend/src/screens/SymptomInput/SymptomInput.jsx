import { useState, useRef } from 'react'
import VoiceButton from '../../components/VoiceButton/VoiceButton'
import VoxelBrain from '../../components/bodyman/VoxelBrain'

const QUICK_PICKS = [
  'Lower back', 'Shoulders', 'Quads',
  'Chest', 'Neck',
]

export default function SymptomInput({ onSubmit, onVisual, onBack }) {
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
    <div className="screen symptom-screen" style={{ overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 100 }}>
        <button className="outline-btn" onClick={onBack}><span className="outline-btn__arrow">←</span>Back</button>
      </div>

      {/* 3D model — right half, behind content */}
      <div style={{ position: 'fixed', top: 0, right: '0%', width: '42%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
        <VoxelBrain autoRotate disperse={false} style={{ pointerEvents: 'none' }} />
      </div>

      {/* Content — natural width, left side */}
      <div style={{ maxWidth: 480, position: 'relative', zIndex: 1 }}>
      <p className="chat-eyebrow">
        <span className="eyebrow-dot" />
        SOMA · Body Companion
      </p>

      <h2 className="screen-heading">
        What's bothering<br />
        <em className="accent">you today?</em>
      </h2>

      <p className="screen-sub">
        Describe your symptoms and Oso will help you understand what's going on.
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

      <div className="input-row" style={{ marginTop: 10 }}>
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

      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <button className="cta-btn" onClick={submit} disabled={!text.trim()}>
          Chat with Oso
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M3 9h12M11 5l4 4-4 4" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

      </div>
      </div>
    </div>
  )
}
