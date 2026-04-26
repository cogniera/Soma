import { useEffect, useRef } from 'react'
import { speak } from '../../services/elevenlabs'
import './EmergencyBanner.css'

export default function EmergencyBanner({ triageResult, onDismiss, onOsoMood }) {
  const { severity, redFlags = [], summary = '' } = triageResult ?? {}
  const is911 = severity >= 5
  const dismissed = useRef(false)

  useEffect(() => {
    const msg = is911
      ? "Heads up — this sounds serious. Please call 911 or get to an ER now. I've highlighted the affected area below."
      : "A quick note: your symptoms suggest you should see a doctor soon. I'll show you the area so you understand what might be going on."

    onOsoMood?.('wave')
    speak(msg, { onEnd: () => onOsoMood?.('idle') })
  }, [])

  const handleDismiss = () => {
    if (dismissed.current) return
    dismissed.current = true
    onDismiss?.()
  }

  return (
    <div className={`emergency-banner ${is911 ? 'emergency-banner--911' : 'emergency-banner--warn'}`}
      role="alertdialog" aria-modal="false" aria-label="Health alert">

      <div className="eb-header">
        <span className="eb-icon" aria-hidden>{is911 ? '🚨' : '⚠️'}</span>
        <strong className="eb-title">
          {is911 ? 'Seek emergency care now' : 'See a doctor soon'}
        </strong>
        <button className="eb-close" onClick={handleDismiss} aria-label="Dismiss alert">✕</button>
      </div>

      <p className="eb-body">
        {is911
          ? "Your symptoms may be a medical emergency. Don't wait."
          : "These symptoms need professional attention. Keep reading to understand more."}
      </p>

      {redFlags.length > 0 && (
        <ul className="eb-flags">
          {redFlags.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      )}

      <div className="eb-actions">
        {is911 && (
          <a className="eb-btn eb-btn--911" href="tel:911">📞 Call 911</a>
        )}
        <a
          className="eb-btn eb-btn--er"
          href="https://www.google.com/maps/search/emergency+room+near+me"
          target="_blank" rel="noopener noreferrer"
        >
          📍 Find nearest ER
        </a>
        <button className="eb-btn eb-btn--dismiss" onClick={handleDismiss}>
          Continue to body map →
        </button>
      </div>
    </div>
  )
}