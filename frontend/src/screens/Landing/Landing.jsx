import './Landing.css'
import bearsImg from './assets/bears-anatomy.png'

export default function Landing({ onChat, onExplore }) {
  return (
    <div className="landing-root">
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,800&family=Nunito:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
      />

      {/* Wavy ribbon background */}
      <div className="landing-hero-bg">
        <svg viewBox="0 0 1280 720" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100vw', height: '100vh' }}>
          <defs>
            <linearGradient id="rib1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".55" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rib2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FFE0A8" stopOpacity="0" />
              <stop offset="100%" stopColor="#FFE0A8" stopOpacity=".7" />
            </linearGradient>
          </defs>
          <path d="M-50,420 C 200,300 380,560 600,420 C 820,280 980,520 1330,360 L 1330,720 L -50,720 Z" fill="url(#rib1)" />
          <path d="M380,0 C 480,160 360,320 520,440 C 680,560 600,680 760,720 L 380,720 Z" fill="url(#rib2)" opacity=".55" />
          <path d="M820,-20 C 880,180 760,280 920,420 C 1080,560 980,700 1180,720 L 820,720 Z" fill="url(#rib2)" opacity=".4" />
        </svg>
      </div>

      <main className="landing-page">
        <section className="landing-hero">

          {/* NAV */}
          <nav className="landing-nav">
            <div className="landing-brand">
              <span className="landing-brand-mark">
                <img src="/mainlogo.png" alt="Soma" />
              </span>
            </div>

            <div className="landing-nav-links">
              <a href="#" className="is-active">Home</a>
              <a href="https://github.com/cogniera/Soma" target="_blank" rel="noopener noreferrer">How it works</a>
              <a href="https://github.com/cogniera/Soma" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://devpost.com/software/soma" target="_blank" rel="noopener noreferrer">Devpost</a>
            </div>

            <div className="landing-nav-actions">
              <button className="landing-btn landing-btn-outline">Sign in</button>
              <button className="landing-btn landing-btn-primary" onClick={onChat}>Start a check-in</button>
            </div>
          </nav>

          {/* Decorative sprig */}
          <svg className="landing-sprig" viewBox="0 0 130 180" fill="none" aria-hidden="true">
            <path d="M65 180 C 60 130, 75 90, 65 30" stroke="#A85F12" strokeWidth="2" strokeLinecap="round" opacity=".55" />
            <ellipse cx="38" cy="90" rx="22" ry="13" transform="rotate(-30 38 90)" fill="#9BC9B7" opacity=".85" />
            <ellipse cx="92" cy="60" rx="20" ry="12" transform="rotate(20 92 60)" fill="#C9D9B5" opacity=".85" />
            <ellipse cx="50" cy="40" rx="16" ry="10" transform="rotate(-10 50 40)" fill="#9BC9B7" opacity=".75" />
            <circle cx="68" cy="22" r="9" fill="#F2B94A" />
            <circle cx="68" cy="22" r="4" fill="#A85F12" opacity=".25" />
          </svg>

          {/* HERO BODY */}
          <div className="landing-hero-body">

            {/* LEFT: text */}
            <div className="landing-hero-text">
              <h1 className="landing-hero-title">
                <span className="line line-1">A gentler way to <span className="hi">listen</span></span><br />
                <span className="line line-2">to what your <span className="hi-dark">body</span></span><br />
                <span className="line line-3">is saying.</span>
              </h1>

              <p className="landing-hero-sub">
                Talk to SOMA about a headache, a tightness, a tired week —
                and walk away with a clearer picture of what's going on, in
                words you'd actually use.
              </p>

              <div className="landing-cta-row">
                <button className="landing-btn-hero" onClick={onChat}>
                  Start a check-in
                  <span className="arrow">→</span>
                </button>
                <button className="landing-btn-explore" onClick={onExplore}>
                  Explore the body
                  <span className="arrow">→</span>
                </button>
              </div>
            </div>

            {/* RIGHT: image */}
            <div className="landing-hero-image-wrap">
              <div className="landing-hero-image">
                <img
                  src={bearsImg}
                  alt="SOMA bear teaching a class of small bears about human anatomy"
                />
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* Diagonal cream frame across bottom */}
      <div className="landing-bottom-frame" aria-hidden="true">
        <svg viewBox="0 0 1440 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="frameGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FFF8E8" stopOpacity=".95" />
              <stop offset="100%" stopColor="#FFF1D2" stopOpacity=".95" />
            </linearGradient>
          </defs>
          <path d="M0,90 C 320,40 760,180 1120,90 C 1280,55 1380,75 1440,55 L 1440,200 L 0,200 Z" fill="url(#frameGrad)" />
          <path d="M0,110 C 280,70 720,200 1100,110 C 1260,80 1380,100 1440,80 L 1440,200 L 0,200 Z" fill="#FFFAEC" opacity=".55" />
        </svg>
      </div>

    </div>
  )
}
