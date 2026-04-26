import osoIdle from '../../assets/oso-idle.png'

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
        src={osoIdle}
        alt="Oso health companion"
        className="oso-corner-img"
        draggable={false}
      />
    </div>
  )
}
