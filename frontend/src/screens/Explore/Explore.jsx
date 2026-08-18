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

const DESCRIPTION = {
  Face: 'The facial muscles control expression, chewing, and speech. They attach directly to skin rather than bone, allowing the fine, varied movements behind every smile, frown, and word you mouth.',
  Neck: 'Neck muscles like the sternocleidomastoid and scalenes flex, rotate, and stabilize the head. They also assist breathing by lifting the upper ribs during deep inhalation.',
  Chest: 'The pectoralis major and minor power pushing motions and bring the arms across the body. They attach from the sternum and clavicle to the upper arm, shaping the front of the torso.',
  Core: 'The core — rectus abdominis and deep stabilizers like the transverse abdominis — flexes the trunk, stabilizes the spine, and transfers force between the upper and lower body.',
  Obliques: 'The internal and external obliques wrap around the sides of the abdomen. They rotate and side-bend the trunk and resist twisting, making them critical for athletic motion.',
  Back: 'The latissimus dorsi and erectors run along the back. The lats pull the arms down and back; the erectors hold you upright and extend the spine when you stand or lift.',
  Upper_Trap: 'The upper trapezius elevates the shoulder blades and supports the neck. It is one of the most chronically tense muscles, often tightening from desk posture and stress.',
  Lower_Trap: 'The lower trapezius depresses and rotates the shoulder blade downward. Strong lower traps stabilize the scapula during overhead lifting and prevent shoulder impingement.',
  Front_Delt: 'The anterior deltoid raises the arm in front of the body and assists pressing motions. It works alongside the chest in pushing exercises.',
  Side_Delt: 'The lateral deltoid abducts the arm out to the side. It is the muscle most responsible for shoulder width and is heavily recruited in lateral raises.',
  Rear_Delt: 'The posterior deltoid pulls the arm backward and externally rotates it. It is essential for shoulder health and balanced posture but often underdeveloped.',
  Arms: 'The biceps flex the elbow and supinate the forearm; the triceps extend the elbow. Together they manage almost every push, pull, or carry your arms perform.',
  Forearm: 'Forearm muscles control wrist and finger movement and grip strength. They are densely packed with small muscles that flex, extend, and rotate the hand.',
  Hand: 'The intrinsic hand muscles allow precision movements — pinching, gripping, and the fine independent finger control behind writing, typing, and tool use.',
  Glutes_Hip: 'The gluteus maximus, medius, and minimus extend, abduct, and rotate the hip. They are the largest muscles in the body and drive running, jumping, and standing power.',
  Quads: 'The quadriceps — four muscles on the front of the thigh — extend the knee and flex the hip. They absorb landing forces and power every step you take uphill.',
  Hamstrings: 'The hamstrings flex the knee and extend the hip. They counteract the quads and are critical for sprinting speed; tightness here often shows up as low-back discomfort.',
  IT_Band: 'The iliotibial band is a thick fascial band running along the outer thigh. It stabilizes the knee during walking and running; tightness can cause lateral knee pain.',
  Lower_leg: 'The calves — gastrocnemius and soleus — plantar-flex the ankle, propelling each step. The tibialis anterior on the front lifts the foot to clear the ground while walking.',
  Foot: 'The intrinsic foot muscles support the arch and provide fine control during balance and push-off. They absorb impact and adapt the foot to uneven terrain.',
}

const SOMA = {
  ink900: '#3A2410',
  ink700: '#5A4226',
  ink500: '#8A7458',
  ink300: '#D6C9AE',
  honey300: '#F2B94A',
  honey400: '#E89B2D',
  honey500: '#D4811E',
  surface: '#FFFFFF',
  surface2: '#FFFBF1',
  glow: '0 8px 24px rgba(232,155,45,.28)',
  shadowMd: '0 2px 6px rgba(90,66,38,.05), 0 12px 28px rgba(90,66,38,.07)',
  shadowLg: '0 4px 10px rgba(90,66,38,.06), 0 24px 48px rgba(90,66,38,.10)',
  fontDisplay: '"Fraunces", Georgia, serif',
  fontBody: '"Nunito", system-ui, sans-serif',
}

const groupBtnBase = {
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 700,
  fontFamily: SOMA.fontBody,
  borderRadius: 999,
  cursor: 'pointer',
  transition: 'background .18s ease, color .18s ease, border-color .18s ease, transform .12s ease',
  whiteSpace: 'nowrap',
  flex: '1 1 calc(33% - 6px)',
  textAlign: 'center',
}

export default function Explore({ onBack }) {
  const [active, setActive] = useState(null)

  const toggle = (g) => setActive(prev => prev === g ? null : g)

  return (
    <div style={{ position: 'fixed', inset: 0, fontFamily: SOMA.fontBody }}>
      <VoxelBrain focusGroup={active} onGroupClick={toggle} />

      {/* Group buttons — right side panel, 3 per row */}
      <div style={{
        position: 'absolute', top: '50%', right: 28,
        transform: 'translateY(-50%)',
        width: 240,
        display: 'flex', flexDirection: 'column', gap: 10,
        background: SOMA.surface,
        border: `1px solid ${SOMA.ink300}`,
        borderRadius: 18,
        padding: 14,
        boxShadow: SOMA.shadowMd,
      }}>
        {/* Eyebrow */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 11, fontWeight: 800, letterSpacing: '0.20em',
          textTransform: 'uppercase',
          color: SOMA.honey500,
          padding: '2px 4px',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: SOMA.honey400,
            boxShadow: `0 0 0 3px rgba(232,155,45,.18)`,
          }} />
          Body Map
        </div>

        {/* Reset */}
        <button
          onClick={() => setActive(null)}
          style={{
            ...groupBtnBase,
            flex: 'none', width: '100%',
            background: SOMA.honey400,
            color: '#fff',
            border: '1.5px solid transparent',
            boxShadow: SOMA.glow,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = SOMA.honey500 }}
          onMouseLeave={(e) => { e.currentTarget.style.background = SOMA.honey400 }}
        >
          Reset view
        </button>

        {/* Group buttons — 3 per row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {GROUPS.map(g => {
            const isActive = active === g
            return (
              <button
                key={g}
                onClick={() => toggle(g)}
                style={{
                  ...groupBtnBase,
                  background: isActive ? SOMA.ink900 : SOMA.surface2,
                  color: isActive ? '#fff' : SOMA.ink700,
                  border: `1.5px solid ${isActive ? SOMA.ink900 : SOMA.ink300}`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = SOMA.honey400
                    e.currentTarget.style.color = SOMA.ink900
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = SOMA.ink300
                    e.currentTarget.style.color = SOMA.ink700
                  }
                }}
              >
                {LABEL[g]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Back button */}
      <div style={{ position: 'absolute', top: 24, left: 24 }}>
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 18px',
            background: SOMA.surface,
            color: SOMA.honey500,
            border: `1.5px solid ${SOMA.honey300}`,
            borderRadius: 999,
            fontFamily: SOMA.fontBody,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: SOMA.shadowMd,
            transition: 'background .18s ease, border-color .18s ease, transform .12s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FFFAEC'
            e.currentTarget.style.borderColor = SOMA.honey400
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = SOMA.surface
            e.currentTarget.style.borderColor = SOMA.honey300
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>←</span>
          Back
        </button>
      </div>

      {/* Description panel — left side, appears when a group is selected */}
      {active && (
        <div style={{
          position: 'absolute', top: '50%', left: 28,
          transform: 'translateY(-50%)',
          width: 320,
          background: SOMA.surface,
          border: `1px solid ${SOMA.ink300}`,
          borderRadius: 18,
          padding: '22px 24px',
          color: SOMA.ink900,
          boxShadow: SOMA.shadowLg,
          pointerEvents: 'none',
          fontFamily: SOMA.fontBody,
        }}>
          {/* Honey ribbon accent */}
          <div style={{
            position: 'absolute', top: 0, left: 24, right: 24,
            height: 3,
            background: `linear-gradient(90deg, ${SOMA.honey300}, ${SOMA.honey400})`,
            borderRadius: '0 0 3px 3px',
          }} />

          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 11, fontWeight: 800, letterSpacing: '0.20em',
            textTransform: 'uppercase',
            color: SOMA.honey500,
            marginBottom: 10,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: SOMA.honey400,
              boxShadow: `0 0 0 3px rgba(232,155,45,.18)`,
            }} />
            Muscle group
          </div>

          {/* Title */}
          <h2 style={{
            fontFamily: SOMA.fontDisplay,
            fontWeight: 700,
            fontSize: 30,
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
            margin: '0 0 14px',
            color: SOMA.ink900,
          }}>
            <span style={{ color: SOMA.honey400, fontStyle: 'italic', fontWeight: 600 }}>
              {LABEL[active]}
            </span>
          </h2>

          {/* Description */}
          <p style={{
            margin: 0,
            fontSize: 14.5,
            lineHeight: 1.55,
            color: SOMA.ink700,
          }}>
            {DESCRIPTION[active] ?? 'No description available for this group yet.'}
          </p>
        </div>
      )}
    </div>
  )
}
