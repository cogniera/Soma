import { useEffect, useState } from 'react'
import { BODY_REGIONS } from '../../constants/bodyRegions'
import { anatomyNarration } from '../../services/claude'
import { speak } from '../../services/elevenlabs'
import VoxelBrain from '../../components/bodyman/VoxelBrain'

export default function Anatomy({ bodyRegion, symptomSummary, onBack, onRestart, onOsoMood }) {
  const [narration, setNarration] = useState('')
  const [loading, setLoading]     = useState(true)

  const region = BODY_REGIONS[bodyRegion] ?? BODY_REGIONS.lower_back

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

  // narration and region data (narration, region.conditions, region.label) are kept
  // in state above and will be used later — not rendered for now

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <VoxelBrain />

      <div style={{ position: 'absolute', bottom: 24, left: 24, display: 'flex', gap: 10 }}>
        <button className="outline-btn" onClick={onBack}>← Back to body map</button>
        <button className="outline-btn" onClick={onRestart}>Start over</button>
      </div>
    </div>
  )
}
