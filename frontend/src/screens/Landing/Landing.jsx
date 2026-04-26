export default function Landing({ onChat, onExplore }) {
  return (
    <div className="screen landing-screen">
      <div className="landing-logo">
        <div className="logo-mark" style={{ width: 60, height: 60 }}>
          <svg viewBox="0 0 56 56" fill="none" width="60" height="60">
            <circle cx="28" cy="28" r="26" stroke="url(#land-warm)" strokeWidth="2" />
            <circle cx="28" cy="28" r="12" fill="url(#land-glow)" opacity="0.35" />
            <path d="M14 21 Q28 13 42 21 Q56 29 42 37 Q28 45 14 37 Q0 29 14 21Z"
              stroke="url(#land-orbit)" strokeWidth="1.8" fill="none" strokeDasharray="4 3" />
            <circle cx="18" cy="14" r="5" fill="url(#land-warm)" opacity="0.6" />
            <circle cx="38" cy="14" r="5" fill="url(#land-warm)" opacity="0.6" />
            <circle cx="18" cy="14" r="2.5" fill="#FFCBA4" />
            <circle cx="38" cy="14" r="2.5" fill="#FFCBA4" />
            <ellipse cx="28" cy="31" rx="3.5" ry="2.5" fill="url(#land-warm)" opacity="0.9" />
            <circle cx="23" cy="26" r="2.2" fill="#4A2C10" />
            <circle cx="33" cy="26" r="2.2" fill="#4A2C10" />
            <circle cx="23.8" cy="25.3" r="0.8" fill="white" />
            <circle cx="33.8" cy="25.3" r="0.8" fill="white" />
            <defs>
              <linearGradient id="land-warm" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F5A623" /><stop offset="1" stopColor="#E8892B" />
              </linearGradient>
              <radialGradient id="land-glow" cx="50%" cy="50%" r="50%">
                <stop stopColor="#F5A623" /><stop offset="1" stopColor="#F5A623" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="land-orbit" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                <stop stopColor="#5ECFC0" /><stop offset="1" stopColor="#A8DCDA" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className="soma-word" style={{ fontSize: '1.9rem', letterSpacing: '0.28em' }}>SOMA</span>
      </div>

      <div className="landing-hero">
        <h1 className="landing-greeting">
          Hi, I'm <em className="accent">Oso</em> 🐻
        </h1>
        <p className="landing-tagline">What would you like to do today?</p>
      </div>

      <div className="landing-cards">
        <button className="landing-card" onClick={onChat}>
          <span className="lc-icon" aria-hidden>💬</span>
          <div className="lc-content">
            <strong className="lc-title">Chat with Oso</strong>
            <p className="lc-desc">Something's bothering you — tell me and I'll help you understand what's going on.</p>
          </div>
          <svg className="lc-arrow" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M3 9h12M11 5l4 4-4 4" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button className="landing-card" onClick={onExplore}>
          <span className="lc-icon" aria-hidden>🫀</span>
          <div className="lc-content">
            <strong className="lc-title">Explore the human body</strong>
            <p className="lc-desc">Browse the interactive 3D anatomy model — no symptoms needed.</p>
          </div>
          <svg className="lc-arrow" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M3 9h12M11 5l4 4-4 4" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
