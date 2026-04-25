import { useEffect, useRef } from 'react'

const COLORS = ['#34d399', '#86efac', '#fbbf24', '#fb923c', '#f87171']
const LABELS = ['Mild', 'Moderate', 'Concerning', 'Urgent', 'Emergency']

// Arc gauge: half-circle, 180°
const R = 70
const STROKE = 10
const CIRCUMFERENCE = Math.PI * R  // half circle

export default function SeverityGauge({ level = 1 }) {
  const idx    = Math.min(Math.max(level - 1, 0), 4)
  const color  = COLORS[idx]
  const label  = LABELS[idx]
  const fill   = (level / 5) * CIRCUMFERENCE

  const arcRef = useRef(null)

  useEffect(() => {
    const el = arcRef.current
    if (!el) return
    // Start at 0 then animate to fill
    el.style.strokeDashoffset = CIRCUMFERENCE
    requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)'
      el.style.strokeDashoffset = CIRCUMFERENCE - fill
    })
  }, [fill])

  return (
    <div className="severity-gauge">
      <svg
        viewBox={`${-R - STROKE} ${-R - STROKE} ${(R + STROKE) * 2} ${R + STROKE + 20}`}
        className="gauge-svg"
      >
        {/* Track */}
        <path
          d={`M ${-R} 0 A ${R} ${R} 0 0 1 ${R} 0`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          ref={arcRef}
          d={`M ${-R} 0 A ${R} ${R} 0 0 1 ${R} 0`}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
        {/* Level number */}
        <text
          x="0" y="-4"
          textAnchor="middle"
          fill={color}
          fontSize="36"
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {level}
        </text>
        <text
          x="0" y="18"
          textAnchor="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize="11"
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="0.1em"
          textTransform="uppercase"
        >
          / 5
        </text>
      </svg>
      <p className="gauge-label" style={{ color }}>{label}</p>
    </div>
  )
}
