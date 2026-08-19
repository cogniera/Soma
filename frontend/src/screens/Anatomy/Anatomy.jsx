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

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <VoxelBrain focusGroup={activeFocus} disperse={false} />

      <div className="anatomy-actions-bar">
        <button className="outline-btn" onClick={onBack}><span className="outline-btn__arrow">←</span>Back to body map</button>
        <button className="outline-btn" onClick={onRestart}>Start over</button>
      </div>
    </div>
  )
}
