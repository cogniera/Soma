import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// ─── Constants ────────────────────────────────────────────────────────────────

const MUSCLE_IDS = [
  'trapezius_left', 'trapezius_right',
  'rhomboid_left',  'rhomboid_right',
  'erector_left',   'erector_right',
  'lat_left',       'lat_right',
  'deltoid_left',   'deltoid_right',
  'rotator_left',   'rotator_right',
  'glute_left',     'glute_right',
  'quad_left',      'quad_right',
  'hamstring_left', 'hamstring_right',
]

const BASE_COLOR   = '#c0524a'
const ACTIVE_COLOR = '#ff4422'

const FACES = [
  { normal: [ 1, 0, 0], corners: [[ 1,-1,-1],[ 1, 1,-1],[ 1, 1, 1],[ 1,-1, 1]] },
  { normal: [-1, 0, 0], corners: [[-1,-1, 1],[-1, 1, 1],[-1, 1,-1],[-1,-1,-1]] },
  { normal: [ 0, 1, 0], corners: [[-1, 1,-1],[-1, 1, 1],[ 1, 1, 1],[ 1, 1,-1]] },
  { normal: [ 0,-1, 0], corners: [[-1,-1, 1],[-1,-1,-1],[ 1,-1,-1],[ 1,-1, 1]] },
  { normal: [ 0, 0, 1], corners: [[ 1,-1, 1],[ 1, 1, 1],[-1, 1, 1],[-1,-1, 1]] },
  { normal: [ 0, 0,-1], corners: [[-1,-1,-1],[-1, 1,-1],[ 1, 1,-1],[ 1,-1,-1]] },
]

// ─── Geometry builder ─────────────────────────────────────────────────────────

function buildMuscleGeometry(data, voxelSize, color) {
  const voxelCount  = data.length / 4
  const vertCount   = voxelCount * 6 * 4  // 6 faces × 4 verts
  const indexCount  = voxelCount * 6 * 6  // 6 faces × 6 indices (2 tris)

  const positions = new Float32Array(vertCount * 3)
  const normals   = new Float32Array(vertCount * 3)
  const colors    = new Float32Array(vertCount * 3)
  const indices   = new Uint32Array(indexCount)

  const baseCol = new THREE.Color(color)
  const half    = voxelSize / 2

  let vi = 0  // vertex index (in floats)
  let ii = 0  // index pointer
  let vertBase = 0  // absolute vertex number

  for (let i = 0; i < data.length; i += 4) {
    const cx   = data[i]
    const cy   = data[i + 1]
    const cz   = data[i + 2]
    const tone = data[i + 3]

    const r = baseCol.r * tone
    const g = baseCol.g * tone
    const b = baseCol.b * tone

    for (const face of FACES) {
      const [nx, ny, nz] = face.normal

      for (const [ox, oy, oz] of face.corners) {
        positions[vi]     = cx + ox * half
        positions[vi + 1] = cy + oy * half
        positions[vi + 2] = cz + oz * half
        normals[vi]       = nx
        normals[vi + 1]   = ny
        normals[vi + 2]   = nz
        colors[vi]        = r
        colors[vi + 1]    = g
        colors[vi + 2]    = b
        vi += 3
      }

      // Two triangles per quad face (CCW)
      indices[ii++] = vertBase
      indices[ii++] = vertBase + 1
      indices[ii++] = vertBase + 2
      indices[ii++] = vertBase
      indices[ii++] = vertBase + 2
      indices[ii++] = vertBase + 3
      vertBase += 4
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('normal',   new THREE.BufferAttribute(normals,   3))
  geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  return geo
}

// ─── Mannequin ────────────────────────────────────────────────────────────────

const MANNEQUIN_PARTS = [
  { type: 'sphere',   rx: 0.18, ry: 0.22, rz: 0.18, cx: 0,     cy: 4.55, cz: 0 },
  { type: 'cylinder', rt: 0.08, rb: 0.1,  h: 0.2,   cx: 0,     cy: 4.3,  cz: 0 },
  { type: 'box',      w: 0.9,   h: 1.1,   d: 0.35,  cx: 0,     cy: 3.55, cz: 0 },
  { type: 'box',      w: 1.2,   h: 0.25,  d: 0.3,   cx: 0,     cy: 4.05, cz: 0 },
  { type: 'box',      w: 0.78,  h: 0.5,   d: 0.32,  cx: 0,     cy: 2.85, cz: 0 },
  { type: 'box',      w: 0.82,  h: 0.3,   d: 0.35,  cx: 0,     cy: 2.45, cz: 0 },
  { type: 'cylinder', rt: 0.08, rb: 0.07, h: 0.55,  cx: -0.68, cy: 3.78, cz: 0 },
  { type: 'cylinder', rt: 0.08, rb: 0.07, h: 0.55,  cx:  0.68, cy: 3.78, cz: 0 },
  { type: 'cylinder', rt: 0.14, rb: 0.12, h: 0.9,   cx: -0.2,  cy: 1.7,  cz: 0 },
  { type: 'cylinder', rt: 0.14, rb: 0.12, h: 0.9,   cx:  0.2,  cy: 1.7,  cz: 0 },
  { type: 'cylinder', rt: 0.1,  rb: 0.07, h: 0.85,  cx: -0.2,  cy: 0.85, cz: 0 },
  { type: 'cylinder', rt: 0.1,  rb: 0.07, h: 0.85,  cx:  0.2,  cy: 0.85, cz: 0 },
]

function MannequinPart({ part }) {
  let geo
  if (part.type === 'sphere') {
    geo = <sphereGeometry args={[part.rx, 12, 10]} />
  } else if (part.type === 'cylinder') {
    geo = <cylinderGeometry args={[part.rt, part.rb, part.h, 10]} />
  } else {
    geo = <boxGeometry args={[part.w, part.h, part.d]} />
  }
  return (
    <mesh position={[part.cx, part.cy, part.cz]}>
      {geo}
      <meshStandardMaterial
        color="#b0a898"
        wireframe
        transparent
        opacity={0.18}
        depthWrite={false}
      />
    </mesh>
  )
}

function Mannequin() {
  return (
    <group renderOrder={-1}>
      {MANNEQUIN_PARTS.map((part, i) => (
        <MannequinPart key={i} part={part} />
      ))}
    </group>
  )
}

// ─── MuscleMesh ───────────────────────────────────────────────────────────────

function MuscleMesh({ id, data, voxelSize, active, faded, onClick }) {
  const meshRef = useRef()

  const geo = useMemo(
    () => buildMuscleGeometry(data, voxelSize, active ? ACTIVE_COLOR : BASE_COLOR),
    [data, voxelSize, active]
  )

  useEffect(() => () => geo.dispose(), [geo])

  return (
    <mesh
      ref={meshRef}
      geometry={geo}
      onClick={(e) => { e.stopPropagation(); onClick(id) }}
    >
      <meshStandardMaterial
        vertexColors
        transparent
        opacity={faded ? 0.15 : 1}
        depthWrite={!faded}
      />
    </mesh>
  )
}

// ─── CameraTracker ────────────────────────────────────────────────────────────

function CameraTracker({ onUpdate }) {
  useFrame(({ camera }) => {
    onUpdate(camera.position)
  })
  return null
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function Scene({ muscles, selected, onSelect, onCamUpdate }) {
  return (
    <>
      <CameraTracker onUpdate={onCamUpdate} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <OrbitControls makeDefault target={[0, 2.5, 0]} />

      {/* Click background to deselect */}
      <mesh
        position={[0, 2.5, -10]}
        onClick={() => onSelect(null)}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial />
      </mesh>

      <Mannequin />

      {muscles.map(({ id, data, voxelSize }) => (
        <MuscleMesh
          key={id}
          id={id}
          data={data}
          voxelSize={voxelSize}
          active={selected === id}
          faded={selected !== null && selected !== id}
          onClick={onSelect}
        />
      ))}
    </>
  )
}

// ─── VoxelTest ────────────────────────────────────────────────────────────────

export default function VoxelTest() {
  const [muscles, setMuscles]   = useState([])
  const [selected, setSelected] = useState(null)
  const [camPos, setCamPos]     = useState({ x: 0, y: 3, z: 6 })

  // Load all JSONs on mount
  useEffect(() => {
    let cancelled = false
    Promise.all(
      MUSCLE_IDS.map(id =>
        fetch(`/voxels/${id}.json`).then(r => r.json()).then(json => ({ id, ...json }))
      )
    ).then(results => {
      if (!cancelled) setMuscles(results)
    })
    return () => { cancelled = true }
  }, [])

  const handleSelect = useCallback((id) => {
    setSelected(prev => (prev === id ? null : id))
  }, [])

  const handleCamUpdate = useCallback((pos) => {
    setCamPos({ x: +pos.x.toFixed(2), y: +pos.y.toFixed(2), z: +pos.z.toFixed(2) })
  }, [])

  const selectedMuscle = muscles.find(m => m.id === selected)
  const voxelCount     = selectedMuscle ? selectedMuscle.data.length / 4 : 0

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarTitle}>MUSCLES</div>
        {MUSCLE_IDS.map(id => (
          <div
            key={id}
            style={{
              ...styles.sidebarItem,
              ...(selected === id ? styles.sidebarItemActive : {}),
            }}
            onClick={() => handleSelect(id)}
          >
            {id}
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div style={styles.canvasWrap} onClick={() => { if (selected) setSelected(null) }}>
        {muscles.length === 0 ? (
          <div style={styles.loading}>loading voxels…</div>
        ) : (
          <Canvas
            style={{ width: '100%', height: '100%' }}
            camera={{ position: [0, 2.8, 6], fov: 45 }}
            gl={{ antialias: true }}
            onCreated={({ gl }) => gl.setClearColor('#f2ebe0')}
          >
            <Scene
              muscles={muscles}
              selected={selected}
              onSelect={handleSelect}
              onCamUpdate={handleCamUpdate}
            />
          </Canvas>
        )}

        {/* Selected label */}
        {selected && (
          <div style={styles.label}>{selected.replace(/_/g, ' ')}</div>
        )}
      </div>

      {/* Debug overlay */}
      <div style={styles.debug}>
        <div>muscles loaded: {muscles.length}</div>
        <div>selected: {selected ?? '—'}</div>
        <div>voxels: {selected ? voxelCount : '—'}</div>
        <div>cam: {camPos.x} {camPos.y} {camPos.z}</div>
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  root: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    background: '#f2ebe0',
    fontFamily: 'monospace',
    color: '#1a1a1a',
    fontSize: '11px',
    overflow: 'hidden',
    position: 'relative',
  },
  sidebar: {
    width: '200px',
    flexShrink: 0,
    borderRight: '1px solid #d8d0c4',
    overflowY: 'auto',
    padding: '8px 0',
    background: '#ece5da',
  },
  sidebarTitle: {
    color: '#8a7f72',
    padding: '4px 12px 8px',
    letterSpacing: '0.1em',
    borderBottom: '1px solid #d8d0c4',
    marginBottom: '4px',
  },
  sidebarItem: {
    padding: '5px 12px',
    cursor: 'pointer',
    color: '#4a4035',
    whiteSpace: 'nowrap',
  },
  sidebarItemActive: {
    color: '#c0402a',
    background: '#e8d8cc',
  },
  canvasWrap: {
    flex: 1,
    position: 'relative',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#8a7f72',
  },
  label: {
    position: 'absolute',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#c0402a',
    fontSize: '13px',
    letterSpacing: '0.08em',
    pointerEvents: 'none',
  },
  debug: {
    position: 'absolute',
    bottom: '12px',
    left: '212px',
    color: '#a09080',
    lineHeight: '1.7',
    pointerEvents: 'none',
  },
}
