import { useEffect, useRef, useState, useCallback } from 'react'
import { speak } from '../../services/elevenlabs'

const GREETING =
  "Hi! I'm Oso, your personal health companion. I'm here to help you understand what your body is telling you. What's been bothering you today?"

const styles = `
  :root {
    --honey:    #F5A623;
    --amber:    #E8892B;
    --cream:    #FEF6EB;
    --blush:    #FFCBA4;
    --teal:     #5ECFC0;
    --sky:      #A8DCDA;
    --brown:    #4A2C10;
    --soft-brown: #7A4F2D;
    --white:    #FFFDF9;
  }

  .intro-root {
    position: fixed; inset: 0;
    background: var(--cream);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
    font-family: 'Nunito', sans-serif;
  }

  /* ── Grain texture overlay ── */
  .intro-root::before {
    content: '';
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    background-size: 200px 200px;
    opacity: 0.5;
  }

  /* ── Floating blobs in background ── */
  .blob {
    position: absolute; border-radius: 50%;
    pointer-events: none; z-index: 0;
    filter: blur(60px);
  }
  .blob-1 {
    width: 340px; height: 340px;
    background: radial-gradient(circle, #F5A62366 0%, transparent 70%);
    top: -80px; left: -80px;
    animation: blob-drift 8s ease-in-out infinite alternate;
  }
  .blob-2 {
    width: 280px; height: 280px;
    background: radial-gradient(circle, #5ECFC044 0%, transparent 70%);
    bottom: -60px; right: -60px;
    animation: blob-drift 10s ease-in-out infinite alternate-reverse;
  }
  .blob-3 {
    width: 200px; height: 200px;
    background: radial-gradient(circle, #FFCBA455 0%, transparent 70%);
    top: 40%; left: -40px;
    animation: blob-drift 12s ease-in-out infinite alternate;
  }
  @keyframes blob-drift {
    from { transform: translate(0, 0) scale(1); }
    to   { transform: translate(20px, 30px) scale(1.08); }
  }

  /* ── Logo stage ── */
  .logo-stage {
    position: relative; z-index: 10;
    display: flex; flex-direction: column; align-items: center; gap: 0;
    animation: logo-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  .logo-stage--out {
    animation: logo-bye 0.45s cubic-bezier(0.4, 0, 0.6, 1) forwards;
  }
  @keyframes logo-pop {
    from { opacity: 0; transform: scale(0.6) translateY(24px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes logo-bye {
    to { opacity: 0; transform: scale(0.8) translateY(-20px); }
  }

  /* ── Honeycomb / paw pulse rings ── */
  .pulse-rings {
    position: absolute;
    width: 180px; height: 180px;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .p-ring {
    position: absolute; inset: 0;
    border-radius: 50%;
    border: 2px solid var(--honey);
    opacity: 0;
    animation: ring-pulse 3s ease-out infinite;
  }
  .p-ring.r2 { animation-delay: 1s;   border-color: var(--amber); }
  .p-ring.r3 { animation-delay: 2s;   border-color: var(--blush); }
  @keyframes ring-pulse {
    0%  { transform: scale(0.6); opacity: 0.7; }
    100%{ transform: scale(2.2); opacity: 0; }
  }

  /* ── Logo body ── */
  .logo-body {
    position: relative; z-index: 1;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
  }

  /* ── Bear paw mark ── */
  .logo-mark {
    width: 96px; height: 96px;
    background: var(--white);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    box-shadow:
      0 0 0 3px var(--honey),
      0 8px 32px #F5A62340,
      inset 0 2px 4px #fff8;
    animation: mark-wobble 4s ease-in-out infinite;
  }
  @keyframes mark-wobble {
    0%, 100% { transform: rotate(-2deg) scale(1); }
    50%       { transform: rotate(2deg) scale(1.03); }
  }

  .soma-word {
    font-family: 'Baloo 2', cursive;
    font-size: 2.8rem;
    font-weight: 800;
    letter-spacing: 0.18em;
    color: var(--brown);
    line-height: 1;
    margin: 10px 0 0;
    /* Stamped honey look */
    text-shadow:
      0 1px 0 #fff,
      2px 3px 0 #F5A62330;
  }

  .soma-sub {
    font-family: 'Nunito', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--soft-brown);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.75;
    margin: 2px 0 0;
  }

  /* ── Little paw prints scattered ── */
  .paw-prints {
    position: absolute; inset: 0; pointer-events: none;
    overflow: hidden;
  }
  .paw {
    position: absolute;
    font-size: 1.2rem;
    opacity: 0.12;
    animation: paw-float 6s ease-in-out infinite;
  }
  .paw:nth-child(1)  { top: 15%; left: 10%; animation-delay: 0s;   font-size: 1rem; }
  .paw:nth-child(2)  { top: 22%; right: 12%; animation-delay: 1s;  font-size: 0.9rem; }
  .paw:nth-child(3)  { bottom: 20%; left: 18%; animation-delay: 2s; }
  .paw:nth-child(4)  { bottom: 28%; right: 15%; animation-delay: 3s; font-size: 1rem; }
  .paw:nth-child(5)  { top: 55%; left: 5%;  animation-delay: 1.5s; font-size: 0.8rem; }
  @keyframes paw-float {
    0%, 100% { transform: translateY(0) rotate(-5deg); }
    50%       { transform: translateY(-10px) rotate(5deg); }
  }

  /* ── Mascot center ── */
  .mascot-center {
    position: fixed; z-index: 10;
    top: calc(50% - 110px);
    left: calc(50% - 110px);
    width: 220px; height: 220px;
    display: flex; align-items: center; justify-content: center;
    animation: mascot-arrive 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  @keyframes mascot-arrive {
    from { opacity: 0; transform: scale(0.5) translateY(30px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  /* Warm glowing halo */
  .mascot-halo {
    position: absolute; inset: -20px;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      #F5A62320,
      #5ECFC030,
      #FFCBA440,
      #F5A62320
    );
    animation: halo-spin 6s linear infinite;
    filter: blur(12px);
  }
  @keyframes halo-spin {
    to { transform: rotate(360deg); }
  }

  /* Honey ring around video */
  .mascot-ring {
    position: absolute; inset: -6px;
    border-radius: 50%;
    border: 3px solid transparent;
    background:
      linear-gradient(var(--white), var(--white)) padding-box,
      linear-gradient(135deg, var(--honey), var(--teal), var(--blush)) border-box;
    animation: ring-rotate 4s linear infinite;
  }
  @keyframes ring-rotate {
    to { transform: rotate(360deg); }
  }

  .mascot-video {
    position: relative; z-index: 2;
    width: 180px; height: 180px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow:
      0 0 0 5px var(--white),
      0 12px 48px #F5A62355,
      0 4px 16px #0001;
  }

  /* Breathing heartbeat dot below video */
  .heart-beat {
    position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%);
    display: flex; gap: 5px; z-index: 3;
  }
  .hb-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--honey);
    animation: hb 1.2s ease-in-out infinite;
  }
  .hb-dot:nth-child(2) { animation-delay: 0.2s; background: var(--teal); }
  .hb-dot:nth-child(3) { animation-delay: 0.4s; background: var(--blush); }
  @keyframes hb {
    0%, 100% { transform: scale(1);   opacity: 0.5; }
    50%       { transform: scale(1.4); opacity: 1; }
  }
`

export default function Intro({ onComplete }) {
  const [logoPhase, setLogoPhase] = useState('in')
  const [showVideo, setShowVideo] = useState(false)
  const centerRef = useRef(null)
  const doneRef   = useRef(false)

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

  useEffect(() => {
    const t1 = setTimeout(() => setLogoPhase('out'), 1900)
    const t2 = setTimeout(() => setShowVideo(true), 2350)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    if (!showVideo) return
    const id = setTimeout(triggerDone, 9000)
    return () => clearTimeout(id)
  }, [showVideo, triggerDone])

  return (
    <>
      <style>{styles}</style>

      <div className="intro-root">
        {/* Atmospheric blobs */}
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />

        {/* Floating paw prints */}
        <div className="paw-prints" aria-hidden="true">
          <span className="paw">🐾</span>
          <span className="paw">🐾</span>
          <span className="paw">🐾</span>
          <span className="paw">🐾</span>
          <span className="paw">🐾</span>
        </div>

        {!showVideo && (
          <div className={`logo-stage${logoPhase === 'out' ? ' logo-stage--out' : ''}`}>
            <div className="pulse-rings" aria-hidden="true">
              <span className="p-ring r1" />
              <span className="p-ring r2" />
              <span className="p-ring r3" />
            </div>

            <div className="logo-body">
              {/* Bear-face mark with SOMA's existing SVG */}
              <div className="logo-mark">
                <svg viewBox="0 0 56 56" fill="none" width="58" height="58">
                  {/* Outer warm ring */}
                  <circle cx="28" cy="28" r="26" stroke="url(#lg-warm)" strokeWidth="2" />
                  {/* Inner glow */}
                  <circle cx="28" cy="28" r="12" fill="url(#lg-glow)" opacity="0.35" />
                  {/* Orbit path */}
                  <path
                    d="M14 21 Q28 13 42 21 Q56 29 42 37 Q28 45 14 37 Q0 29 14 21Z"
                    stroke="url(#lg-orbit)" strokeWidth="1.8" fill="none"
                    strokeDasharray="4 3"
                  />
                  {/* Bear ears (two arcs) */}
                  <circle cx="18" cy="14" r="5" fill="url(#lg-warm)" opacity="0.6" />
                  <circle cx="38" cy="14" r="5" fill="url(#lg-warm)" opacity="0.6" />
                  <circle cx="18" cy="14" r="2.5" fill="url(#lg-blush)" />
                  <circle cx="38" cy="14" r="2.5" fill="url(#lg-blush)" />
                  {/* Bear nose */}
                  <ellipse cx="28" cy="31" rx="3.5" ry="2.5" fill="url(#lg-warm)" opacity="0.9"/>
                  {/* Eyes */}
                  <circle cx="23" cy="26" r="2.2" fill="#4A2C10" />
                  <circle cx="33" cy="26" r="2.2" fill="#4A2C10" />
                  <circle cx="23.8" cy="25.3" r="0.8" fill="white" />
                  <circle cx="33.8" cy="25.3" r="0.8" fill="white" />
                  <defs>
                    <linearGradient id="lg-warm" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#F5A623" /><stop offset="1" stopColor="#E8892B" />
                    </linearGradient>
                    <radialGradient id="lg-glow" cx="50%" cy="50%" r="50%">
                      <stop stopColor="#F5A623" /><stop offset="1" stopColor="#F5A623" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="lg-orbit" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#5ECFC0" /><stop offset="1" stopColor="#A8DCDA" />
                    </linearGradient>
                    <linearGradient id="lg-blush" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
                      <stop stopColor="#FFCBA4" /><stop offset="1" stopColor="#F5A623" />
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
            <div className="mascot-ring" aria-hidden="true" />
            <video
              className="mascot-video"
              src="/mascot.mp4"
              autoPlay muted playsInline
              onEnded={handleVideoEnd}
            />
            <div className="heart-beat" aria-hidden="true">
              <span className="hb-dot" />
              <span className="hb-dot" />
              <span className="hb-dot" />
            </div>
          </div>
        )}
      </div>
    </>
  )
}