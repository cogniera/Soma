import { BODY_REGIONS } from '../../constants/bodyRegions'

// Minimal body silhouette paths — front and back
const FRONT_OUTLINE = `
  M100,12 C86,12 74,22 74,38 C74,54 86,64 100,64 C114,64 126,54 126,38 C126,22 114,12 100,12 Z
  M100,64 C100,64 84,68 74,76 C60,86 52,98 52,110 L52,200 C52,206 57,210 62,210
  L80,210 L80,380 C80,386 85,390 90,390 L110,390 C115,390 120,386 120,380 L120,210
  L138,210 C143,210 148,206 148,200 L148,110 C148,98 140,86 126,76 C116,68 100,64 100,64 Z
  M62,210 L40,380 C38,386 42,390 48,390 L68,390 L80,210 Z
  M138,210 L152,390 L132,390 C128,390 124,386 120,380 L120,210 Z
`

const BACK_OUTLINE = FRONT_OUTLINE // simplified — mirrors front for demo

export default function BodyMapSVG({ highlighted, selected, onSelect, view = 'front' }) {
  const regions = Object.entries(BODY_REGIONS).filter(([, r]) => r.view === view)

  return (
    <svg
      viewBox="0 0 200 420"
      className="body-map-svg"
      aria-label="Interactive body map"
    >
      {/* Silhouette */}
      <path
        d={view === 'front' ? FRONT_OUTLINE : BACK_OUTLINE}
        fill="rgba(56,189,248,0.06)"
        stroke="rgba(56,189,248,0.25)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Region overlays */}
      {regions.map(([key, region]) => {
        const { cx, cy, rx, ry } = region.svg
        const isHighlighted = key === highlighted
        const isSelected    = key === selected

        return (
          <g key={key} onClick={() => onSelect(key)} style={{ cursor: 'pointer' }}>
            <ellipse
              cx={cx} cy={cy} rx={rx} ry={ry}
              fill={
                isSelected    ? `${region.color}30` :
                isHighlighted ? `${region.color}20` :
                'transparent'
              }
              stroke={
                isSelected    ? region.color :
                isHighlighted ? region.color :
                'rgba(255,255,255,0.08)'
              }
              strokeWidth={isSelected ? 2.5 : isHighlighted ? 2 : 1}
              style={isHighlighted ? { filter: `drop-shadow(0 0 8px ${region.color})` } : undefined}
            />
            {/* Pulse ring on highlighted */}
            {isHighlighted && (
              <ellipse
                cx={cx} cy={cy} rx={rx + 6} ry={ry + 6}
                fill="none"
                stroke={region.color}
                strokeWidth="1"
                opacity="0"
                className="region-pulse"
              />
            )}
            {/* Label */}
            {(isHighlighted || isSelected) && (
              <text
                x={cx} y={cy + ry + 14}
                textAnchor="middle"
                fill={region.color}
                fontSize="9"
                fontFamily="Inter, system-ui"
                fontWeight="600"
                letterSpacing="0.08em"
              >
                {region.label.toUpperCase()}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
