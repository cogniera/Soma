import { useEffect, useRef, useState } from "react"
import gsap from "gsap"

import osoWave   from "../../assets/oso-wave.png"
import osoSpeak  from "../../assets/oso-speak.png"
import osoIdle   from "../../assets/oso-idle.png"

// ─── which image is showing ───────────────────────────────────
const STATES = {
  WAVE:  osoWave,
  SPEAK: osoSpeak,
  IDLE:  osoIdle,
}

export default function Oso({ onAnimationComplete }) {
  const containerRef = useRef(null)   // the whole Oso wrapper
  const imgRef       = useRef(null)   // the <img> tag
  const idleTlRef    = useRef(null)   // idle loop timeline (so we can kill it cleanly)

  const [currentSrc, setCurrentSrc] = useState(STATES.WAVE)

  useEffect(() => {
    const container = containerRef.current
    const img       = imgRef.current
    if (!container || !img) return

    // ── 0. Start invisible, shifted down ──────────────────────
    gsap.set(container, { opacity: 0, y: 60, scale: 0.85 })

    // ── Master timeline ────────────────────────────────────────
    const tl = gsap.timeline({
      onComplete: () => {
        // tell the parent screen that Oso is done talking
        if (onAnimationComplete) onAnimationComplete()
        startIdleLoop()
      }
    })

    // ── 1. Oso bounces in (waving state) ──────────────────────
    tl.to(container, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.75,
      ease: "back.out(1.6)",      // the bouncy overshoot feel
    })

    // ── 2. Whole body does one excited little hop ──────────────
    .to(container, {
      y: -18,
      duration: 0.22,
      ease: "power2.out",
    })
    .to(container, {
      y: 0,
      duration: 0.28,
      ease: "bounce.out",         // lands with a squish feeling
    })

    // ── 3. Body tilts slightly left as wave finishes ───────────
    .to(container, {
      rotation: -6,
      duration: 0.25,
      ease: "power1.inOut",
    })
    .to(container, {
      rotation: 0,
      duration: 0.3,
      ease: "power2.out",
    })

    // ── 4. Cross-fade to SPEAK state (arm down, big smile) ─────
    // We fade the image out, swap src, fade back in
    .to(img, {
      opacity: 0,
      duration: 0.25,
      ease: "power1.in",
      onComplete: () => setCurrentSrc(STATES.SPEAK),
    })
    .to(img, {
      opacity: 1,
      duration: 0.3,
      ease: "power1.out",
    })

    // ── 5. Happy little body pulse (he's excited to talk) ──────
    .to(container, {
      scaleX: 1.06,
      scaleY: 0.96,
      duration: 0.15,
      ease: "power2.out",
    })
    .to(container, {
      scaleX: 1,
      scaleY: 1,
      duration: 0.2,
      ease: "elastic.out(1, 0.5)",
    })

    // ── 6. Hold on speaking face while ElevenLabs plays ────────
    //    (adjust duration to match your audio clip length)
    .to({}, { duration: 0.8 })

    // ── 7. Cross-fade to IDLE state ────────────────────────────
    .to(img, {
      opacity: 0,
      duration: 0.3,
      ease: "power1.in",
      onComplete: () => setCurrentSrc(STATES.IDLE),
    })
    .to(img, {
      opacity: 1,
      duration: 0.35,
      ease: "power1.out",
    })

    return () => {
      tl.kill()
      if (idleTlRef.current) idleTlRef.current.kill()
    }
  }, [])

  // ── Idle loop: gentle float + micro head tilt ────────────────
  // Runs forever after the entry animation finishes
  function startIdleLoop() {
    const container = containerRef.current
    if (!container) return

    idleTlRef.current = gsap.timeline({ repeat: -1, yoyo: true })
      .to(container, {
        y: -10,                   // float up 10px
        rotation: 1.5,            // tiny tilt
        duration: 1.8,
        ease: "sine.inOut",
      })
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{
        display: "inline-block",
        transformOrigin: "center bottom",  // squish from the feet up
        cursor: "default",
        userSelect: "none",
      }}
    >
      <img
        ref={imgRef}
        src={currentSrc}
        alt="Oso, your health companion"
        style={{
          width: "260px",          // adjust to your layout
          height: "auto",
          display: "block",
          // no border, no shadow — let the bg do the work
        }}
        // Swap the draggable off so it doesn't look broken in demo
        draggable={false}
      />
    </div>
  )
}