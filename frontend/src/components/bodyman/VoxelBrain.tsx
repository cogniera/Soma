import { useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
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

type SharedUniforms = {
  uHoverCenter: { value: THREE.Vector3 };
  uHoverRadius: { value: number };
  uHoverStrength: { value: number };
  uHoverJitter: { value: number };
};

function buildGroupMesh(
  grid: HeadGrid,
  r: number, g: number, b: number,
  uniforms: SharedUniforms,
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
    Object.assign(shader.uniforms, uniforms);
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
  };

  return new THREE.Mesh(geometry, material);
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
  Biceps:      "#4fa8d9",
  Triceps:     "#c46f2a",
  Forearm:     "#2e7eb8",
  Hand:        "#1a5c9a",
  Core:        "#e8c84a",
  Obliques:    "#c8b99a",
  Back:        "#4caf7d",
  Glutes_Hip:  "#d99b5b",
  Quads:       "#5b9bd9",
  Hamstrings:  "#b85c2a",
  IT_Band:     "#4caf7d",
  Adductors:   "#9b6bbf",
  Lower_leg:   "#a05a22",
  Foot:        "#7a3f14",
};

function Man() {
  const hoverTarget = useRef({
    center: new THREE.Vector3(0, -1000, 0),
    radius: 0,
    strength: 0,
  });

  const uniformsRef = useRef<SharedUniforms | null>(null);
  if (!uniformsRef.current) {
    uniformsRef.current = {
      uHoverCenter: { value: new THREE.Vector3(0, -1000, 0) },
      uHoverRadius: { value: 0 },
      uHoverStrength: { value: 0 },
      uHoverJitter: { value: HOVER_JITTER },
    };
  }
  const uniforms = uniformsRef.current;

  const groupMeshes = useMemo(() => {
    const entries = buildGroupGrids();
    const color = new THREE.Color();
    return entries.map(({ name, grid }, i) => {
      const hex = GROUP_COLORS[name];
      if (hex) color.set(hex);
      else color.setHSL((i / entries.length) % 1, 0.7, 0.55);
      return buildGroupMesh(grid, color.r, color.g, color.b, uniforms);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniforms]);

  useFrame((_, dt) => {
    const target = hoverTarget.current;
    const ease = target.radius > uniforms.uHoverRadius.value ? EASE_IN : EASE_OUT;
    const t = 1 - Math.exp(-ease * dt);
    uniforms.uHoverRadius.value += (target.radius - uniforms.uHoverRadius.value) * t;
    uniforms.uHoverStrength.value += (target.strength - uniforms.uHoverStrength.value) * t;
    uniforms.uHoverCenter.value.lerp(
      target.center,
      1 - Math.exp(-CENTER_LERP_RATE * dt),
    );
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    hoverTarget.current.center.copy(e.point);
    hoverTarget.current.radius = HOVER_RADIUS;
    hoverTarget.current.strength = HOVER_STRENGTH;
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    hoverTarget.current.radius = 0;
    hoverTarget.current.strength = 0;
  };

  return (
    <>
      {groupMeshes.map((mesh, i) => (
        <primitive
          key={i}
          object={mesh}
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
        />
      ))}
    </>
  );
}

export default function VoxelBrain() {
  return (
    <Canvas
      camera={{ position: [10, 0.3, 10], fov: 42, near: 0.5, far: 80 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[6, 8, 6]} intensity={1.15} />
      <Man />
      <OrbitControls
        enablePan={false}
        minDistance={6}
        maxDistance={22}
        target={[0, 0.3, 0]}
      />
    </Canvas>
  );
}
