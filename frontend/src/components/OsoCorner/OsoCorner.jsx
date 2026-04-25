import osoIdle  from '../../assets/oso-idle.png'
import osoSpeak from '../../assets/oso-speak.png'
import osoWave  from '../../assets/oso-wave.png'

const SPRITE = { idle: osoIdle, speak: osoSpeak, wave: osoWave }

export default function OsoCorner({ mood = 'idle', onClick }) {
  return (
    <div
      className={`oso-corner${mood === 'speak' ? ' oso-corner--speak' : ''}`}
      onClick={onClick}
      title="SOMA is here for you"
      role="button"
      tabIndex={0}
    >
      <img
        src={SPRITE[mood] || osoIdle}
        alt="Oso health companion"
        className="oso-corner-img"
        draggable={false}
      />
    </div>
  )
}
