import { useEffect, useState } from 'react'
import { BODY_REGIONS } from '../../constants/bodyRegions'
import { anatomyNarration } from '../../services/claude'
import { speak } from '../../services/elevenlabs'

export default function Anatomy({ bodyRegion, symptomSummary, onBack, onRestart, onOsoMood }) {
  const [narration, setNarration] = useState('')
  const [loading, setLoading]     = useState(true)
  const [iframeReady, setIframeReady] = useState(false)

  const region = BODY_REGIONS[bodyRegion] ?? BODY_REGIONS.lower_back

  useEffect(() => {
    let cancelled = false

    async function run() {
      const text = await anatomyNarration(bodyRegion, symptomSummary)
      if (cancelled) return
      setNarration(text)
      setLoading(false)

      onOsoMood?.('speak')
      await speak(text, { onEnd: () => onOsoMood?.('idle') })
    }

    run()
    return () => { cancelled = true }
  }, [bodyRegion, symptomSummary])

  return (
    <div className="screen anatomy-screen">
      <div className="anatomy-layout">
        {/* BioDigital iframe */}
        <div className="biodigital-wrap">
          {!iframeReady && (
            <div className="biodigital-loading">
              <div className="triage-spinner" />
              <p>Loading 3D model…</p>
            </div>
          )}
          <iframe
            className="biodigital-frame"
            src={region.biodigitalUrl}
            title={`3D anatomy — ${region.label}`}
            allow="fullscreen"
            onLoad={() => setIframeReady(true)}
            style={{ opacity: iframeReady ? 1 : 0 }}
          />
        </div>

        {/* Info panel */}
        <div className="anatomy-panel">
          <p className="chat-eyebrow">
            <span className="eyebrow-dot" style={{ background: region.color }} />
            {region.label}
          </p>

          <h2 className="screen-heading" style={{ fontSize: '1.5rem', marginBottom: 12 }}>
            Understanding your<br />
            <em className="accent">{region.label.toLowerCase()}</em>
          </h2>

          {loading ? (
            <div className="narration-skeleton">
              <div className="skel-line" />
              <div className="skel-line skel-line--short" />
              <div className="skel-line" />
            </div>
          ) : (
            <p className="narration-text">{narration}</p>
          )}

          <div className="conditions-list">
            <p className="conditions-heading">Common causes</p>
            {region.conditions.map((c, i) => (
              <div key={i} className="condition-chip">{c}</div>
            ))}
          </div>

          <div className="anatomy-disclaimer">
            This is educational information only. Always consult a healthcare professional for diagnosis and treatment.
          </div>

          <div className="anatomy-actions">
            <button className="outline-btn" onClick={onBack}>← Back to body map</button>
            <button className="outline-btn" onClick={onRestart}>Start over</button>
          </div>
        </div>
      </div>
    </div>
  )
}
