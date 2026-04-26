const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&display=swap');

  .lp-root {
    position: fixed; inset: 0;
    font-family: 'Nunito', system-ui, sans-serif;
    color: #3A2410;
    overflow: hidden;
    background:
      radial-gradient(ellipse 80% 70% at 110% 50%, rgba(242,185,74,.28), transparent 55%),
      radial-gradient(ellipse 60% 60% at -10% 10%, rgba(242,185,74,.12), transparent 55%),
      linear-gradient(145deg, #FFF9ED 0%, #FDECC8 60%, #F7D88A 100%);
    animation: lp-in .45s ease both;
  }
  @keyframes lp-in { from { opacity: 0; } to { opacity: 1; } }

  /* Subtle dot texture */
  .lp-root::before {
    content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image:
      radial-gradient(circle at 15% 20%, rgba(168,95,18,.09) 1.3px, transparent 2px),
      radial-gradient(circle at 75% 15%, rgba(168,95,18,.07) 1.3px, transparent 2px),
      radial-gradient(circle at 40% 70%, rgba(168,95,18,.09) 1.5px, transparent 2px),
      radial-gradient(circle at 88% 65%, rgba(168,95,18,.07) 1.3px, transparent 2px),
      radial-gradient(circle at 20% 85%, rgba(168,95,18,.09) 1.3px, transparent 2px),
      radial-gradient(circle at 58% 35%, rgba(168,95,18,.06) 1.1px, transparent 2px);
    background-size: 460px 460px;
  }

  /* Wavy ribbon accents */
  .lp-ribbons {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
  }

  /* ── Nav ── */
  .lp-nav {
    position: relative; z-index: 5;
    display: flex; align-items: center;
    padding: 28px 64px;
  }
  .lp-brand {
    display: flex; align-items: center; gap: 10px;
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 700; font-size: 20px; color: #3A2410;
    letter-spacing: -0.01em;
  }

  /* ── Two-column hero ── */
  .lp-hero {
    position: relative; z-index: 4;
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 0; align-items: center;
    padding: 0 64px;
    height: calc(100vh - 90px);
  }

  /* ── Left column ── */
  .lp-left { display: flex; flex-direction: column; gap: 0; padding-right: 32px; }

  .lp-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 10.5px; font-weight: 800; letter-spacing: .22em;
    text-transform: uppercase; color: #A85F12;
    margin-bottom: 18px;
  }
  .lp-eyebrow::before {
    content: ""; width: 6px; height: 6px; border-radius: 50%;
    background: #E89B2D; box-shadow: 0 0 0 3px rgba(232,155,45,.2);
    flex-shrink: 0;
  }

  .lp-headline {
    font-family: 'Fraunces', Georgia, serif;
    font-size: clamp(38px, 4.4vw, 66px);
    font-weight: 700; line-height: 1.06;
    letter-spacing: -0.025em;
    margin: 0 0 20px; color: #3A2410;
  }
  .lp-headline em {
    font-style: italic; color: #C07015;
    font-weight: 600;
  }

  .lp-sub {
    font-size: 16.5px; line-height: 1.6; color: #6B4E30;
    margin: 0 0 32px; max-width: 400px;
  }

  /* ── Action cards ── */
  .lp-actions { display: flex; flex-direction: column; gap: 10px; max-width: 400px; }

  .lp-action {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 18px;
    border-radius: 18px; border: none; cursor: pointer;
    text-align: left; width: 100%;
    font-family: 'Nunito', system-ui, sans-serif;
    transition: transform .15s ease, box-shadow .2s ease;
    animation: lp-card-in .45s ease both;
  }
  .lp-action:nth-child(1) { animation-delay: .12s; }
  .lp-action:nth-child(2) { animation-delay: .22s; }
  @keyframes lp-card-in {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .lp-action--primary {
    background: #E89B2D; color: #fff;
    box-shadow: 0 8px 28px rgba(232,155,45,.38);
  }
  .lp-action--primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 36px rgba(232,155,45,.48);
  }
  .lp-action--secondary {
    background: rgba(255,255,255,.65);
    color: #3A2410;
    border: 1.5px solid rgba(90,66,38,.12);
    box-shadow: 0 2px 12px rgba(90,66,38,.06);
    backdrop-filter: blur(10px);
  }
  .lp-action--secondary:hover {
    background: rgba(255,255,255,.82);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(90,66,38,.1);
  }
  .lp-action:active { transform: translateY(0) !important; }

  .lp-action-icon {
    font-size: 1.45rem; flex-shrink: 0; line-height: 1;
    width: 42px; height: 42px; border-radius: 13px;
    display: flex; align-items: center; justify-content: center;
  }
  .lp-action--primary  .lp-action-icon { background: rgba(255,255,255,.18); }
  .lp-action--secondary .lp-action-icon { background: rgba(232,155,45,.12); }

  .lp-action-text { flex: 1; }
  .lp-action-title {
    font-size: 15px; font-weight: 800; line-height: 1.2; display: block;
  }
  .lp-action-desc {
    font-size: 12.5px; font-weight: 600; opacity: .72; display: block; margin-top: 1px;
  }
  .lp-action--secondary .lp-action-desc { color: #6B4E30; }

  .lp-action-arrow {
    flex-shrink: 0; opacity: .6;
    transition: transform .15s ease, opacity .15s;
  }
  .lp-action:hover .lp-action-arrow { opacity: 1; transform: translateX(3px); }

  .lp-trust {
    display: flex; align-items: center; gap: 8px;
    margin-top: 20px;
    font-size: 12px; color: #9A7A56; font-weight: 600;
  }
  .lp-trust-dots { display: flex; gap: 4px; }
  .lp-trust-dots span {
    width: 6px; height: 6px; border-radius: 50%;
  }

  /* ── Right column ── */
  .lp-right {
    display: flex; align-items: center; justify-content: center;
    height: 100%; position: relative;
  }
  .lp-bear-wrap {
    position: relative; width: 100%; max-width: 540px;
    filter: drop-shadow(0 32px 48px rgba(90,66,38,.16));
  }
  .lp-bear-img { width: 100%; height: auto; display: block; }
  .lp-bear-fallback {
    font-size: 10rem; text-align: center; line-height: 1;
    filter: drop-shadow(0 16px 32px rgba(90,66,38,.18));
    animation: lp-bear-float 4s ease-in-out infinite alternate;
  }
  @keyframes lp-bear-float {
    from { transform: translateY(0); }
    to   { transform: translateY(-14px); }
  }

  /* ── Bottom wave ── */
  .lp-wave {
    position: fixed; left: 0; right: 0; bottom: 0;
    width: 100%; height: 15vh;
    pointer-events: none; z-index: 2;
  }
  .lp-wave svg { width: 100%; height: 100%; display: block; }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .lp-nav { padding: 20px 28px; }
    .lp-hero {
      grid-template-columns: 1fr;
      padding: 16px 28px 80px;
      height: auto; overflow-y: auto;
      align-items: start; gap: 32px;
    }
    .lp-left { padding-right: 0; }
    .lp-actions { max-width: 100%; }
    .lp-right { min-height: 240px; }
    .lp-bear-fallback { font-size: 6rem; }
    .lp-headline { font-size: clamp(34px, 8vw, 52px); }
  }
`

function ArrowIcon() {
  return (
    <svg className="lp-action-arrow" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3.5 9h11M10 5l4.5 4L10 13"
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Landing({ onChat, onExplore }) {
  return (
    <>
      <style>{styles}</style>

      <div className="lp-root">

        {/* Wavy ribbon accents */}
        <div className="lp-ribbons" aria-hidden="true">
          <svg viewBox="0 0 1280 720" preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <defs>
              <linearGradient id="lp-r1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fff" stopOpacity=".5" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="lp-r2" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FFE0A8" stopOpacity="0" />
                <stop offset="100%" stopColor="#FFE0A8" stopOpacity=".6" />
              </linearGradient>
            </defs>
            <path d="M-50,420 C 200,300 380,560 600,420 C 820,280 980,520 1330,360 L 1330,720 L -50,720 Z"
              fill="url(#lp-r1)" />
            <path d="M820,-20 C 880,180 760,280 920,420 C 1080,560 980,700 1180,720 L 820,720 Z"
              fill="url(#lp-r2)" opacity=".35" />
          </svg>
        </div>

        {/* Nav */}
        <nav className="lp-nav">
          <div className="lp-brand">
            <img
              src="/mainlogo.png"
              alt="SOMA"
              style={{ height: 36, width: 'auto', display: 'block' }}
            />
          </div>
        </nav>

        {/* Hero */}
        <div className="lp-hero">

          {/* Left — text + actions */}
          <div className="lp-left">

            <div className="lp-eyebrow">SOMA · Your body companion</div>

            <h1 className="lp-headline">
              A gentler way to<br />
              <em>listen</em> to what<br />
              your body is saying.
            </h1>

            <p className="lp-sub">
              Talk to Oso about what's bothering you, or explore the 3D anatomy model
              - understand your body visually.
            </p>

            <div className="lp-actions">
              <button className="lp-action lp-action--primary" onClick={onChat}>
                <span className="lp-action-icon">🐻</span>
                <span className="lp-action-text">
                  <span className="lp-action-title">Chat with Oso</span>
                  <span className="lp-action-desc">Something's bothering you? Tell me.</span>
                </span>
                <ArrowIcon />
              </button>

              <button className="lp-action lp-action--secondary" onClick={onExplore}>
                <span className="lp-action-icon">🫀</span>
                <span className="lp-action-text">
                  <span className="lp-action-title">Explore the human body</span>
                  <span className="lp-action-desc">Browse the interactive 3D anatomy model.</span>
                </span>
                <ArrowIcon />
              </button>
            </div>

            <div className="lp-trust">
              <div className="lp-trust-dots">
                <span style={{ background: '#F2B94A' }} />
                <span style={{ background: '#9BC9B7' }} />
                <span style={{ background: '#F4B999' }} />
              </div>
              Free · No sign-up
            </div>
          </div>

          {/* Right — bear image */}
          <div className="lp-right">
            <div className="lp-bear-wrap">
              <img
                className="lp-bear-img"
                src="/bears.png"
                alt="Oso"
                onError={e => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextSibling.style.display = 'block'
                }}
              />
              <div className="lp-bear-fallback" style={{ display: 'none' }}>🐻</div>
            </div>
          </div>

        </div>

        {/* Bottom wave */}
        <div className="lp-wave" aria-hidden="true">
          <svg viewBox="0 0 1440 160" preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lp-wg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#FFF8E8" stopOpacity=".92" />
                <stop offset="100%" stopColor="#FFEFC8" stopOpacity=".92" />
              </linearGradient>
            </defs>
            <path d="M0,72 C 360,32 720,140 1080,72 C 1260,42 1380,64 1440,48 L 1440,160 L 0,160 Z"
              fill="url(#lp-wg)" />
            <path d="M0,96 C 300,60 680,156 1060,96 C 1240,68 1380,88 1440,72 L 1440,160 L 0,160 Z"
              fill="#FFFAEC" opacity=".5" />
          </svg>
        </div>

      </div>
    </>
  )
}
