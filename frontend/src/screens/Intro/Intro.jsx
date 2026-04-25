import { useEffect, useRef, useState, useCallback } from 'react'
import { speak } from '../../services/elevenlabs'

const GREETING =
  "Hi! I'm Oso, your personal health companion. I'm here to help you understand what your body is telling you. What's been bothering you today?"

export default function Intro({ onComplete }) {
  const [logoPhase, setLogoPhase] = useState('in')
  const [showVideo, setShowVideo] = useState(false)
  const centerRef  = useRef(null)
  const doneRef    = useRef(false)  // prevent double-fire

  // ── Callbacks first (before effects that reference them) ────
  const animateToCorner = useCallback(() => {
    const el = centerRef.current
    if (!el) return

    const r = el.getBoundingClientRect()
    Object.assign(el.style, {
      transition: 'none', position: 'fixed',
      left: r.left + 'px', top: r.top + 'px',
      width: r.width + 'px', height: r.height + 'px',
      transform: 'none',
    })

    const S = 84, M = 24
    requestAnimationFrame(() => requestAnimationFrame(() => {
      Object.assign(el.style, {
        transition: [
          'left 0.9s cubic-bezier(0.4,0,0.2,1)',
          'top 0.9s cubic-bezier(0.4,0,0.2,1)',
          'width 0.9s cubic-bezier(0.4,0,0.2,1)',
          'height 0.9s cubic-bezier(0.4,0,0.2,1)',
          'opacity 0.25s ease 0.7s',
        ].join(','),
        left: M + 'px',
        top: (window.innerHeight - S - M) + 'px',
        width: S + 'px',
        height: S + 'px',
        opacity: '0',
      })
      setTimeout(onComplete, 1050)
    }))
  }, [onComplete])

  const triggerDone = useCallback(async () => {
    if (doneRef.current) return
    doneRef.current = true
    await speak(GREETING)
    animateToCorner()
  }, [animateToCorner])

  const handleVideoEnd = useCallback(() => triggerDone(), [triggerDone])

  // ── Effects after callbacks ──────────────────────────────────
  useEffect(() => {
    const t1 = setTimeout(() => setLogoPhase('out'), 1900)
    const t2 = setTimeout(() => setShowVideo(true), 2350)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Fallback: if browser pauses/blocks the video, still advance
  useEffect(() => {
    if (!showVideo) return
    const id = setTimeout(triggerDone, 9000)
    return () => clearTimeout(id)
  }, [showVideo, triggerDone])

  return (
    <>
      {!showVideo && (
        <div className={`logo-stage${logoPhase === 'out' ? ' logo-stage--out' : ''}`}>
          <div className="pulse-rings" aria-hidden="true">
            <span className="p-ring r1" />
            <span className="p-ring r2" />
            <span className="p-ring r3" />
          </div>
          <div className="logo-body">
            <div className="logo-mark">
              <svg viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="26" stroke="url(#cg1)" strokeWidth="1.5" />
                <circle cx="28" cy="28" r="10" fill="url(#cg2)" opacity="0.25" />
                <path d="M14 21 Q28 13 42 21 Q56 29 42 37 Q28 45 14 37 Q0 29 14 21Z"
                  stroke="url(#cg3)" strokeWidth="1.5" fill="none" />
                <defs>
                  <linearGradient id="cg1" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#38bdf8" /><stop offset="1" stopColor="#818cf8" />
                  </linearGradient>
                  <radialGradient id="cg2" cx="50%" cy="50%" r="50%">
                    <stop stopColor="#38bdf8" /><stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="cg3" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#f59e0b" /><stop offset="1" stopColor="#fcd34d" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="soma-word">SOMA</h1>
            <p className="soma-sub">Your AI Health Companion</p>
          </div>
        </div>
      )}

      {showVideo && (
        <div ref={centerRef} className="mascot-center">
          <div className="mascot-halo" aria-hidden="true" />
          <video
            className="mascot-video"
            src="/mascot.mp4"
            autoPlay muted playsInline
            onEnded={handleVideoEnd}
          />
        </div>
      )}
    </>
  )
}
