import { useEffect, useState } from 'react'
import { BODY_REGIONS } from '../../constants/bodyRegions'
import { anatomyNarration } from '../../services/claude'
import { speak } from '../../services/elevenlabs'
import VoxelBrain from '../../components/bodyman/VoxelBrain'

// Maps a bodyRegion key to the primary muscle group to focus on in VoxelBrain
const REGION_TO_GROUP = {
  head:        'Face',
  neck:        'Neck',
  chest:       'Chest',
  abdomen:     'Core',
  lower_back:  'Back',
  upper_back:  'Upper_Trap',
  left_arm:    'Arms',
  right_arm:   'Arms',
  left_leg:    'Quads',
  right_leg:   'Quads',
}

export default function Anatomy({ bodyRegion, symptomSummary, focusGroup, onBack, onRestart, onOsoMood }) {
  const [narration, setNarration] = useState('')
  const [loading, setLoading]     = useState(true)
  // focusGroup prop lets the caller override (e.g. muscle-story sequencing)
  // fall back to the region default
  const [activeFocus, setActiveFocus] = useState(
    focusGroup ?? REGION_TO_GROUP[bodyRegion] ?? null
  )

  const region = BODY_REGIONS[bodyRegion] ?? BODY_REGIONS.lower_back

  useEffect(() => {
    if (focusGroup !== undefined) setActiveFocus(focusGroup)
  }, [focusGroup])

  useEffect(() => {
    let cancelled = false

    async function run() {
      const text = await anatomyNarration(bodyRegion, symptomSummary)
      if (cancelled) return
      setNarration(text)
      setLoading(false)

      onOsoMood?.('speak')
      await speak(text, { onEnd: () => onOsoMood?.('idle') })
    }

    run()
    return () => { cancelled = true }
  }, [bodyRegion, symptomSummary])

  // TEST ONLY — remove before ship
  const TEST_GROUPS = ['Face','Neck','Chest','Core','Back','Upper_Trap','Arms','Forearm','Hand','Quads','Hamstrings','Lower_leg','Foot']

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <VoxelBrain focusGroup={activeFocus} />

      {/* TEST ONLY */}
      <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {TEST_GROUPS.map(g => (
          <button
            key={g}
            onClick={() => setActiveFocus(g)}
            style={{ padding: '4px 10px', fontSize: 12, background: activeFocus === g ? '#38bdf8' : '#1e293b', color: '#fff', border: '1px solid #38bdf8', borderRadius: 6, cursor: 'pointer' }}
          >
            {g}
          </button>
        ))}
        <button
          onClick={() => setActiveFocus(null)}
          style={{ padding: '4px 10px', fontSize: 12, background: '#7f1d1d', color: '#fff', border: '1px solid #ef4444', borderRadius: 6, cursor: 'pointer' }}
        >
          reset
        </button>
      </div>

      <div style={{ position: 'absolute', bottom: 24, left: 24, display: 'flex', gap: 10 }}>
        <button className="outline-btn" onClick={onBack}>← Back to body map</button>
        <button className="outline-btn" onClick={onRestart}>Start over</button>
      </div>
    </div>
  )
}
