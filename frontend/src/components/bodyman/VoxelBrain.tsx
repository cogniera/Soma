import React, { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { buildGroupGrids, type HeadGrid } from "@/lib/voxel/head-shape";

const FACES: Array<{
  normal: [number, number, number];
  corners: Array<[number, number, number]>;
}> = [
  { normal: [ 1, 0, 0], corners: [[ 1,-1,-1],[ 1, 1,-1],[ 1, 1, 1],[ 1,-1, 1]] },
  { normal: [-1, 0, 0], corners: [[-1,-1, 1],[-1, 1, 1],[-1, 1,-1],[-1,-1,-1]] },
  { normal: [ 0, 1, 0], corners: [[-1, 1,-1],[-1, 1, 1],[ 1, 1, 1],[ 1, 1,-1]] },
  { normal: [ 0,-1, 0], corners: [[-1,-1, 1],[-1,-1,-1],[ 1,-1,-1],[ 1,-1, 1]] },
  { normal: [ 0, 0, 1], corners: [[ 1,-1, 1],[ 1, 1, 1],[-1, 1, 1],[-1,-1, 1]] },
  { normal: [ 0, 0,-1], corners: [[-1,-1,-1],[-1, 1,-1],[ 1, 1,-1],[ 1,-1,-1]] },
];

const HOVER_RADIUS = 0.3;
const HOVER_STRENGTH = 0.45;
const HOVER_JITTER = 0.08;
const EASE_IN = 16;
const EASE_OUT = 7;
const CENTER_LERP_RATE = 22;

const FLY_SPEED = 2.5;
const FLY_ARRIVE_THRESHOLD = 0.05;
const FLY_ZOOM_DISTANCE = 8;

const FADE_SPEED = 4.0;        // lerp speed for dim transition
const DIM_AMOUNT = 0.92;       // how far toward grey (0 = no change, 1 = full grey)

type SharedUniforms = {
  uHoverCenter: { value: THREE.Vector3 };
  uHoverRadius: { value: number };
  uHoverStrength: { value: number };
  uHoverJitter: { value: number };
};

type DimUniform = { value: number };

function buildGroupMesh(
  grid: HeadGrid,
  r: number, g: number, b: number,
  sharedUniforms: SharedUniforms,
  dimUniform: DimUniform,
): THREE.Mesh {
  const v = grid.voxelSize;
  const half = v * 0.5;
  const count = grid.cells.length;
  const positions = new Float32Array(count * 24 * 3);
  const normals = new Float32Array(count * 24 * 3);
  const voxelCenters = new Float32Array(count * 24 * 3);
  const colors = new Float32Array(count * 24 * 3);
  const indices = new Uint32Array(count * 36);
  let vi = 0;
  let ii = 0;

  for (let i = 0; i < grid.cells.length; i++) {
    const c = grid.cells[i];
    const wx = c.x, wy = c.y, wz = c.z;
    for (let f = 0; f < FACES.length; f++) {
      const face = FACES[f];
      const base = vi / 3;
      for (let k = 0; k < 4; k++) {
        const corner = face.corners[k];
        const p0 = vi;
        positions[p0 + 0] = wx + corner[0] * half;
        positions[p0 + 1] = wy + corner[1] * half;
        positions[p0 + 2] = wz + corner[2] * half;
        normals[p0 + 0] = face.normal[0];
        normals[p0 + 1] = face.normal[1];
        normals[p0 + 2] = face.normal[2];
        voxelCenters[p0 + 0] = wx;
        voxelCenters[p0 + 1] = wy;
        voxelCenters[p0 + 2] = wz;
        colors[p0 + 0] = r;
        colors[p0 + 1] = g;
        colors[p0 + 2] = b;
        vi += 3;
      }
      indices[ii++] = base;
      indices[ii++] = base + 1;
      indices[ii++] = base + 2;
      indices[ii++] = base;
      indices[ii++] = base + 2;
      indices[ii++] = base + 3;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("voxelCenter", new THREE.BufferAttribute(voxelCenters, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sharedUniforms);
    shader.uniforms.uDim = dimUniform;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         attribute vec3 voxelCenter;
         uniform vec3 uHoverCenter;
         uniform float uHoverRadius;
         uniform float uHoverStrength;
         uniform float uHoverJitter;

         vec3 groupVoxelRand( vec3 p ) {
           float h  = fract( sin( dot( p, vec3( 12.9898, 78.233, 37.719 ) ) ) * 43758.5453 );
           float h2 = fract( sin( dot( p, vec3( 39.3468, 11.135, 83.155 ) ) ) * 24634.6345 );
           float h3 = fract( sin( dot( p, vec3( 93.9898, 67.345, 28.123 ) ) ) * 93726.1234 );
           return normalize( vec3( h, h2, h3 ) * 2.0 - 1.0 );
         }`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = vec3( position );
         if ( uHoverRadius > 0.0 ) {
           vec3 delta = voxelCenter - uHoverCenter;
           float d = length( delta );
           if ( d < uHoverRadius ) {
             float f = 1.0 - d / uHoverRadius;
             f = f * f;
             vec3 radial = d > 0.0001 ? delta / d : vec3( 0.0, 1.0, 0.0 );
             vec3 rnd = groupVoxelRand( voxelCenter );
             vec3 dir = normalize( radial + rnd * uHoverJitter );
             float mag = 0.6 + fract( rnd.x * 7.31 + rnd.y * 13.17 ) * 0.8;
             transformed += dir * f * uHoverStrength * mag;
           }
         }`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uDim;`,
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
         gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.75), uDim);`,
      );
  };

  const mesh = new THREE.Mesh(geometry, material);

  // Build edge lines — 12 edges per voxel box
  const EDGE_PAIRS: Array<[number, number, number][]> = [
    [[-1,-1,-1],[ 1,-1,-1]], [[-1, 1,-1],[ 1, 1,-1]],
    [[-1,-1, 1],[ 1,-1, 1]], [[-1, 1, 1],[ 1, 1, 1]],
    [[-1,-1,-1],[-1, 1,-1]], [[ 1,-1,-1],[ 1, 1,-1]],
    [[-1,-1, 1],[-1, 1, 1]], [[ 1,-1, 1],[ 1, 1, 1]],
    [[-1,-1,-1],[-1,-1, 1]], [[ 1,-1,-1],[ 1,-1, 1]],
    [[-1, 1,-1],[-1, 1, 1]], [[ 1, 1,-1],[ 1, 1, 1]],
  ];
  const edgePositions = new Float32Array(count * 12 * 2 * 3);
  let ei = 0;
  for (let i = 0; i < grid.cells.length; i++) {
    const c = grid.cells[i];
    for (const [a, b] of EDGE_PAIRS) {
      edgePositions[ei++] = c.x + a[0] * half;
      edgePositions[ei++] = c.y + a[1] * half;
      edgePositions[ei++] = c.z + a[2] * half;
      edgePositions[ei++] = c.x + b[0] * half;
      edgePositions[ei++] = c.y + b[1] * half;
      edgePositions[ei++] = c.z + b[2] * half;
    }
  }
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute("position", new THREE.BufferAttribute(edgePositions, 3));

  const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 });
  edgeMat.onBeforeCompile = (shader) => {
    shader.uniforms.uDim = dimUniform;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uDim;`,
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
         gl_FragColor.a = mix(0.18, 0.0, uDim);`,
      );
  };

  const edges = new THREE.LineSegments(edgeGeo, edgeMat);
  mesh.add(edges);

  return mesh;
}

const GROUP_COLORS: Record<string, string> = {
  Face:        "#00bcd4",
  Eye_muscles: "#f4d4b0",
  Neck:        "#c97b4b",
  Upper_Trap:  "#8b5e3c",
  Lower_Trap:  "#6b4020",
  Front_Delt:  "#5b8dd9",
  Side_Delt:   "#3a6bbf",
  Rear_Delt:   "#2a4e9a",
  Chest:       "#d94f4f",
  Arms:        "#c46f2a",
  Forearm:     "#2e7eb8",
  Hand:        "#1a5c9a",
  Core:        "#e8c84a",
  Obliques:    "#c084fc",
  Back:        "#4caf7d",
  Glutes_Hip:  "#d99b5b",
  Quads:       "#5b9bd9",
  Hamstrings:  "#b85c2a",
  IT_Band:     "#4caf7d",
  Lower_leg:   "#a05a22",
  Foot:        "#7a3f14",
};

// Per-group camera approach direction. Positive Z = front, negative Z = back.
const GROUP_APPROACH: Record<string, [number, number, number]> = {
  Face:        [ 1,  0.2,  1],
  Eye_muscles: [ 1,  0.1,  1],
  Neck:        [ 1,  0.1,  1],
  Chest:       [ 1,  0.1,  1],
  Core:        [ 1,  0,    1],
  Obliques:    [ 1,  0,    1],
  Front_Delt:  [ 1,  0.2,  1],
  Arms:        [ 1,  0,    1],
  Forearm:     [ 1,  0,    1],
  Hand:        [ 1, -0.1,  1],
  Quads:       [ 1,  0,    1],
  Foot:        [ 1, -0.3,  1],
  Back:        [-1,  0.1, -1],
  Upper_Trap:  [-1,  0.3, -1],
  Lower_Trap:  [-1,  0.2, -1],
  Rear_Delt:   [-1,  0.2, -1],
  Side_Delt:   [ 1,  0.1,  0],
  Glutes_Hip:  [-1, -0.1, -1],
  Hamstrings:  [-1,  0,   -1],
  IT_Band:     [ 1,  0,   -0.3],
  Lower_leg:   [-1, -0.1, -1],
};

function computeGroupFocus(groupName: string): { center: THREE.Vector3; dir: THREE.Vector3 } | null {
  const entries = buildGroupGrids();
  const entry = entries.find(e => e.name === groupName);
  if (!entry || entry.grid.cells.length === 0) return null;
  const sum = new THREE.Vector3();
  for (const c of entry.grid.cells) sum.add(new THREE.Vector3(c.x, c.y, c.z));
  sum.divideScalar(entry.grid.cells.length);
  const raw = GROUP_APPROACH[groupName] ?? [0, 0.2, 1];
  const dir = new THREE.Vector3(...raw).normalize();
  return { center: sum, dir };
}

type FlyState = {
  active: boolean;
  target: THREE.Vector3;
  camTarget: THREE.Vector3;
  arrived: boolean;
};

type ManProps = {
  focusGroup: string | null;
  flyState: React.MutableRefObject<FlyState>;
  orbitRef: React.MutableRefObject<any>;
};

function Man({ focusGroup, flyState, orbitRef }: ManProps) {
  const hoverTarget = useRef({
    center: new THREE.Vector3(0, -1000, 0),
    radius: 0,
    strength: 0,
  });

  const sharedUniformsRef = useRef<SharedUniforms | null>(null);
  if (!sharedUniformsRef.current) {
    sharedUniformsRef.current = {
      uHoverCenter: { value: new THREE.Vector3(0, -1000, 0) },
      uHoverRadius: { value: 0 },
      uHoverStrength: { value: 0 },
      uHoverJitter: { value: HOVER_JITTER },
    };
  }
  const sharedUniforms = sharedUniformsRef.current;

  // One dim uniform per group mesh (0 = full colour, 1 = full grey)
  const dimUniformsRef = useRef<Map<string, DimUniform>>(new Map());

  const groupEntries = useMemo(() => buildGroupGrids(), []);

  const groupMeshes = useMemo(() => {
    const color = new THREE.Color();
    return groupEntries.map(({ name, grid }, i) => {
      const hex = GROUP_COLORS[name];
      if (hex) color.set(hex);
      else color.setHSL((i / groupEntries.length) % 1, 0.7, 0.55);

      // Create per-mesh dim uniform, starting at 0 (full colour)
      if (!dimUniformsRef.current.has(name)) {
        dimUniformsRef.current.set(name, { value: 0.0 });
      }
      const dimUniform = dimUniformsRef.current.get(name)!;

      return { name, mesh: buildGroupMesh(grid, color.r, color.g, color.b, sharedUniforms, dimUniform) };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { camera } = useThree();

  useFrame((_, dt) => {
    // --- Camera fly-to ---
    const fly = flyState.current;
    if (fly.active && !fly.arrived) {
      const t = 1 - Math.exp(-FLY_SPEED * dt);
      camera.position.lerp(fly.camTarget, t);
      if (orbitRef.current) {
        orbitRef.current.target.lerp(fly.target, t);
        orbitRef.current.update();
      }
      const distPos = camera.position.distanceTo(fly.camTarget);
      const distTarget = orbitRef.current ? orbitRef.current.target.distanceTo(fly.target) : 0;
      if (distPos < FLY_ARRIVE_THRESHOLD && distTarget < FLY_ARRIVE_THRESHOLD) {
        fly.arrived = true;
        if (orbitRef.current) orbitRef.current.enabled = true;
      }
    }

    // --- Per-group grey fade ---
    const fadeT = 1 - Math.exp(-FADE_SPEED * dt);
    for (const { name } of groupMeshes) {
      const uniform = dimUniformsRef.current.get(name);
      if (!uniform) continue;
      const targetDim = focusGroup === null ? 0.0 : focusGroup === name ? 0.0 : DIM_AMOUNT;
      uniform.value += (targetDim - uniform.value) * fadeT;
    }

    // --- Hover animation ---
    const target = hoverTarget.current;
    const ease = target.radius > sharedUniforms.uHoverRadius.value ? EASE_IN : EASE_OUT;
    const t2 = 1 - Math.exp(-ease * dt);
    sharedUniforms.uHoverRadius.value += (target.radius - sharedUniforms.uHoverRadius.value) * t2;
    sharedUniforms.uHoverStrength.value += (target.strength - sharedUniforms.uHoverStrength.value) * t2;
    sharedUniforms.uHoverCenter.value.lerp(target.center, 1 - Math.exp(-CENTER_LERP_RATE * dt));
  });

  // const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
  //   e.stopPropagation();
  //   hoverTarget.current.center.copy(e.point);
  //   hoverTarget.current.radius = HOVER_RADIUS;
  //   hoverTarget.current.strength = HOVER_STRENGTH;
  // };

  // const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
  //   e.stopPropagation();
  //   hoverTarget.current.radius = 0;
  //   hoverTarget.current.strength = 0;
  // };

  return (
    <>
      {groupMeshes.map(({ mesh }, i) => (
        <primitive
          key={i}
          object={mesh}
          // onPointerMove={handlePointerMove}
          // onPointerOut={handlePointerOut}
        />
      ))}
    </>
  );
}

type SceneProps = {
  focusGroup: string | null;
  autoRotate?: boolean;
};

function Scene({ focusGroup, autoRotate = false }: SceneProps) {
  const orbitRef = useRef<any>(null);

  const flyState = useRef<FlyState>({
    active: false,
    target: new THREE.Vector3(0, 0.3, 0),
    camTarget: new THREE.Vector3(10, 0.3, 10),
    arrived: true,
  });

  const prevFocusGroup = useRef<string | null>(null);
  if (focusGroup !== prevFocusGroup.current) {
    prevFocusGroup.current = focusGroup;

    if (focusGroup) {
      const focus = computeGroupFocus(focusGroup);
      if (focus) {
        const camPos = focus.center.clone().addScaledVector(focus.dir, FLY_ZOOM_DISTANCE);
        flyState.current = { active: true, arrived: false, target: focus.center.clone(), camTarget: camPos };
        if (orbitRef.current) orbitRef.current.enabled = false;
      }
    } else {
      flyState.current = {
        active: true,
        arrived: false,
        target: new THREE.Vector3(0, 0.3, 0),
        camTarget: new THREE.Vector3(7, 0.3, 7),
      };
      if (orbitRef.current) orbitRef.current.enabled = false;
    }
  }

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[-6, 8,  6]} intensity={0.6} />
      <directionalLight position={[ 6, 6, -6]} intensity={0.6} />
      <Man focusGroup={focusGroup} flyState={flyState} orbitRef={orbitRef} />
      <OrbitControls
        ref={orbitRef}
        enablePan={false}
        enableZoom={!autoRotate}
        enableRotate={!autoRotate}
        minDistance={6}
        maxDistance={22}
        target={[0, 0.3, 0]}
        autoRotate={autoRotate}
        autoRotateSpeed={1.2}
      />
    </>
  );
}

type VoxelBrainProps = {
  focusGroup?: string | null;
  autoRotate?: boolean;
  style?: React.CSSProperties;
};

export default function VoxelBrain({ focusGroup = null, autoRotate = false, style }: VoxelBrainProps) {
  return (
    <Canvas
      camera={{ position: [7, 0.3, 7], fov: 42, near: 0.5, far: 80 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      style={{ background: "transparent", ...style }}
    >
      <Scene focusGroup={focusGroup} autoRotate={autoRotate} />
    </Canvas>
  );
}
