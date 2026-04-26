import { useState } from 'react'
import VoxelBrain from '../../components/bodyman/VoxelBrain'

const GROUPS = [
  'Face', 'Neck', 'Chest', 'Core', 'Obliques',
  'Back', 'Upper_Trap', 'Lower_Trap',
  'Front_Delt', 'Side_Delt', 'Rear_Delt',
  'Arms', 'Forearm', 'Hand',
  'Glutes_Hip', 'Quads', 'Hamstrings',
  'IT_Band', 'Lower_leg', 'Foot',
]

const LABEL = {
  Face: 'Face', Neck: 'Neck', Chest: 'Chest', Core: 'Core', Obliques: 'Obliques',
  Back: 'Back', Upper_Trap: 'Upper Trap', Lower_Trap: 'Lower Trap',
  Front_Delt: 'Front Delt', Side_Delt: 'Side Delt', Rear_Delt: 'Rear Delt',
  Arms: 'Arms', Forearm: 'Forearm', Hand: 'Hand',
  Glutes_Hip: 'Glutes & Hip', Quads: 'Quads', Hamstrings: 'Hamstrings',
  IT_Band: 'IT Band', Lower_leg: 'Lower Leg', Foot: 'Foot',
}

const btnBase = {
  padding: '6px 12px',
  fontSize: 11, fontWeight: 700,
  borderRadius: 8, cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap',
  flex: '1 1 calc(33% - 6px)',
  textAlign: 'center',
}

export default function Explore({ onBack }) {
  const [active, setActive] = useState(null)

  const toggle = (g) => setActive(prev => prev === g ? null : g)

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <VoxelBrain focusGroup={active} />

      {/* Group buttons — right side panel, 3 per row */}
      <div style={{
        position: 'absolute', top: '50%', right: 24,
        transform: 'translateY(-50%)',
        width: 220,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {/* Reset */}
        <button
          onClick={() => setActive(null)}
          style={{
            ...btnBase,
            flex: 'none', width: '100%',
            background: 'rgba(127,29,29,0.7)',
            color: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(239,68,68,0.4)',
          }}
        >
          Reset
        </button>

        {/* Group buttons — 3 per row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {GROUPS.map(g => (
            <button
              key={g}
              onClick={() => toggle(g)}
              style={{
                ...btnBase,
                background: active === g ? 'rgba(56,189,248,0.9)' : 'rgba(15,23,42,0.7)',
                color: active === g ? '#fff' : 'rgba(255,255,255,0.75)',
                border: `1px solid ${active === g ? '#38bdf8' : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              {LABEL[g]}
            </button>
          ))}
        </div>
      </div>

      {/* Back button */}
      <div style={{ position: 'absolute', top: 24, left: 24 }}>
        <button className="outline-btn" onClick={onBack}>← Back</button>
      </div>

      {/* Active label */}
      {active && (
        <div style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)',
          color: '#fff', padding: '8px 20px', borderRadius: 20,
          fontSize: 14, fontWeight: 700, border: '1px solid rgba(56,189,248,0.3)',
        }}>
          {LABEL[active]}
        </div>
      )}
    </div>
  )
}
