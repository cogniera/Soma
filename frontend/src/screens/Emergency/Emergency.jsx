import { useEffect } from 'react'
import { speak } from '../../services/elevenlabs'

export default function Emergency({ triageResult, onRestart, onOsoMood }) {
  const { severity, redFlags = [], summary = '' } = triageResult ?? {}

  useEffect(() => {
    const msg = severity >= 5
      ? "This sounds like a medical emergency. Please call 911 right now or have someone take you to the nearest emergency room immediately."
      : "I'm concerned about your symptoms and want to make sure you get the right care. Please reach out to a medical professional as soon as possible."

    onOsoMood?.('wave')
    speak(msg, { onEnd: () => onOsoMood?.('idle') })
  }, [])

  const is911 = severity >= 5

  return (
    <div className="screen emergency-screen">
      <div className="emergency-card">
        <div className="emergency-icon" aria-hidden>
          {is911 ? '🚨' : '⚠️'}
        </div>

        <h2 className="emergency-heading">
          {is911 ? 'Call 911 now' : 'Seek medical attention'}
        </h2>

        <p className="emergency-sub">
          {is911
            ? "Based on your symptoms, this may be a medical emergency. Don't wait — call emergency services immediately."
            : "Your symptoms suggest you need to see a healthcare provider soon. Please don't ignore these warning signs."}
        </p>

        {redFlags.length > 0 && (
          <div className="emergency-flags">
            {redFlags.map((f, i) => (
              <div key={i} className="emergency-flag-item">⚠ {f}</div>
            ))}
          </div>
        )}

        <div className="emergency-actions">
          {is911 && (
            <a className="emergency-btn emergency-btn--911" href="tel:911">
              📞 Call 911
            </a>
          )}
          <a
            className="emergency-btn emergency-btn--er"
            href="https://www.google.com/maps/search/emergency+room+near+me"
            target="_blank"
            rel="noopener noreferrer"
          >
            📍 Find nearest ER
          </a>
          <a
            className="emergency-btn emergency-btn--nurse"
            href="tel:18002221222"
          >
            💊 Poison Control (1-800-222-1222)
          </a>
        </div>

        <div className="emergency-safe">
          <p>If you're safe and this was a false alarm:</p>
          <button className="outline-btn" onClick={onRestart}>Start over</button>
        </div>
      </div>
    </div>
  )
}
