import { useEffect, useState } from 'react'
import SeverityGauge from '../../components/SeverityGauge/SeverityGauge'
import { triage } from '../../services/claude'
import { speak } from '../../services/elevenlabs'
import { guessRegion } from '../../constants/bodyRegions'

export default function Triage({ conversation, symptomText, onContinue, onOsoMood }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      const data = await triage(conversation)
      if (cancelled) return

      if (!data.bodyRegion) data.bodyRegion = guessRegion(symptomText)

      setResult(data)
      setLoading(false)

      const narration = buildNarration(data)
      onOsoMood?.('speak')
      await speak(narration, { onEnd: () => onOsoMood?.('idle') })
    }

    run()
    return () => { cancelled = true }
  }, [])

  function buildNarration({ severity, redFlags, summary }) {
    if (severity >= 5)
      return `I'm concerned about what you've described. ${summary} These symptoms may be a medical emergency — please seek help immediately.`
    if (severity >= 4 || redFlags.length > 0)
      return `${summary} These symptoms deserve prompt attention. I've highlighted the area below so you can learn more.`
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

  const { severity, redFlags, summary } = result
  const is911  = severity >= 5
  const isUrgent = severity >= 4 || redFlags.length > 0

  return (
    <div className={`screen triage-screen${isUrgent ? ' triage-screen--urgent' : ''}`}>
      <p className="chat-eyebrow">
        <span className="eyebrow-dot" style={isUrgent ? { background: '#f87171' } : {}} />
        Symptom Assessment
      </p>

      <h2 className="screen-heading" style={{ fontSize: '1.6rem', marginBottom: 8 }}>
        {isUrgent
          ? <><em className="accent-red">Urgent attention</em> recommended</>
          : 'Here\'s what I found'}
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

      {/* Inline emergency notice — small, non-blocking */}
      {isUrgent && (
        <div className={`triage-emergency-notice${is911 ? ' triage-emergency-notice--911' : ''}`}>
          {is911 ? (
            <>
              <span>🚨</span>
              <span>This may be a medical emergency.</span>
              <a href="tel:911" className="triage-911-link">Call 911</a>
            </>
          ) : (
            <>
              <span>⚠️</span>
              <span>Consider seeing a doctor soon.</span>
            </>
          )}
        </div>
      )}

      <div className="triage-actions">
        <button className="cta-btn" onClick={() => onContinue(result)}>
          View body map
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M3 9h12M11 5l4 4-4 4" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
