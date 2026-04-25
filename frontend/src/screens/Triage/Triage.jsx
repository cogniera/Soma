import { useEffect, useState } from 'react'
import SeverityGauge from '../../components/SeverityGauge/SeverityGauge'
import { triage } from '../../services/claude'
import { speak } from '../../services/elevenlabs'
import { guessRegion } from '../../constants/bodyRegions'

export default function Triage({ conversation, symptomText, onContinue, onEmergency, onOsoMood }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      const data = await triage(conversation)
      if (cancelled) return

      // Fallback region guess if Claude didn't return a valid one
      if (!data.bodyRegion) data.bodyRegion = guessRegion(symptomText)

      setResult(data)
      setLoading(false)

      // Narrate the summary
      const narration = buildNarration(data)
      onOsoMood?.('speak')
      await speak(narration, { onEnd: () => onOsoMood?.('idle') })

      // Auto-redirect if emergency
      if (data.severity >= 4 || data.redFlags.length > 0) {
        setTimeout(() => onEmergency(data), 3500)
      }
    }

    run()
    return () => { cancelled = true }
  }, [])

  function buildNarration({ severity, redFlags, summary }) {
    if (severity >= 4 || redFlags.length > 0)
      return `I'm concerned about what you've described. ${summary} Some of these symptoms may need immediate attention. I'm going to help you get the right care right now.`
    if (severity === 3)
      return `${summary} This is something worth paying attention to. Let me show you more about what might be happening in your body.`
    return `${summary} The good news is this sounds manageable. Let me walk you through what's likely going on in your body.`
  }

  if (loading) {
    return (
      <div className="screen triage-screen triage-screen--loading">
        <div className="triage-spinner" />
        <p className="triage-loading-text">Oso is reviewing your symptoms…</p>
      </div>
    )
  }

  const { severity, redFlags, summary, bodyRegion } = result
  const isUrgent = severity >= 4 || redFlags.length > 0

  return (
    <div className={`screen triage-screen${isUrgent ? ' triage-screen--urgent' : ''}`}>
      <p className="chat-eyebrow">
        <span className="eyebrow-dot" style={isUrgent ? { background: '#f87171' } : {}} />
        Symptom Assessment
      </p>

      <h2 className="screen-heading" style={{ fontSize: '1.6rem', marginBottom: 8 }}>
        {isUrgent ? <><em className="accent-red">Urgent attention</em> recommended</> : 'Here\'s what I found'}
      </h2>

      <SeverityGauge level={severity} />

      <p className="triage-summary">{summary}</p>

      {redFlags.length > 0 && (
        <div className="red-flag-list">
          <p className="red-flag-heading">⚠️ Red flag symptoms detected</p>
          {redFlags.map((f, i) => (
            <div key={i} className="red-flag-item">{f}</div>
          ))}
        </div>
      )}

      <div className="triage-actions">
        {isUrgent ? (
          <button className="cta-btn cta-btn--red" onClick={() => onEmergency(result)}>
            Get help now
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M9 2v7M5.5 12.5l3.5-3.5 3.5 3.5M3 16h12" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <button className="cta-btn" onClick={() => onContinue(result)}>
            Show me my anatomy
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M3 9h12M11 5l4 4-4 4" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
