import { useEffect, useRef, useState } from 'react'
import BodyMapSVG from '../../components/BodyMapSVG/BodyMapSVG'
import { BODY_REGIONS } from '../../constants/bodyRegions'
import { speak } from '../../services/elevenlabs'

export default function BodyMap({ aiRegion, onConfirm, onOsoMood }) {
  const [selected, setSelected]   = useState(aiRegion || null)
  const [view, setView]           = useState('front')
  const [camError, setCamError]   = useState(false)
  const videoRef                  = useRef(null)
  const streamRef                 = useRef(null)

  // Start camera
  useEffect(() => {
    let active = true
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      })
      .catch(() => setCamError(true))

    return () => {
      active = false
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // Announce AI-detected region
  useEffect(() => {
    if (!aiRegion) return
    const region = BODY_REGIONS[aiRegion]
    if (!region) return
    const line = `Based on what you described, I'm highlighting your ${region.label}. Tap anywhere on the body to adjust.`
    onOsoMood?.('speak')
    speak(line, { onEnd: () => onOsoMood?.('idle') })
  }, [aiRegion])

  const confirm = () => {
    if (!selected) return
    streamRef.current?.getTracks().forEach(t => t.stop())
    onConfirm(selected)
  }

  // Switch front/back includes lower_back region which is back-view only
  const backRegions = ['lower_back', 'upper_back']
  const autoView    = selected && backRegions.includes(selected) ? 'back' : view

  return (
    <div className="screen body-map-screen">
      {/* Camera background */}
      <div className="cam-layer">
        {camError ? (
          <div className="cam-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M15 10l4.553-2.527A1 1 0 0 1 21 8.373V15.63a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"
                stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" />
            </svg>
            <p>Camera unavailable</p>
          </div>
        ) : (
          <video ref={videoRef} className="cam-feed" autoPlay muted playsInline />
        )}
        <div className="cam-vignette" />
      </div>

      {/* Body map overlay */}
      <div className="body-map-overlay">
        <div className="body-map-card">
          <div className="view-toggle">
            <button className={view === 'front' ? 'view-btn--on' : 'view-btn'}
              onClick={() => setView('front')}>Front</button>
            <button className={view === 'back' ? 'view-btn--on' : 'view-btn'}
              onClick={() => setView('back')}>Back</button>
          </div>

          <BodyMapSVG
            highlighted={aiRegion}
            selected={selected}
            onSelect={setSelected}
            view={autoView}
          />

          {selected && (
            <p className="region-selected-label">
              <span style={{ color: BODY_REGIONS[selected]?.color }}>
                {BODY_REGIONS[selected]?.label}
              </span>
              {' '}selected
            </p>
          )}
        </div>
      </div>

      {/* Instruction + CTA */}
      <div className="body-map-footer">
        <p className="body-map-hint">
          {aiRegion
            ? `I detected your ${BODY_REGIONS[aiRegion]?.label ?? aiRegion.replace('_', ' ')}. Tap to adjust.`
            : 'Tap where it hurts'}
        </p>
        <button className="cta-btn" onClick={confirm} disabled={!selected}>
          Explore this area
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M3 9h12M11 5l4 4-4 4" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
