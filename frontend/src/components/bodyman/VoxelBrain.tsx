import React, { useEffect, useMemo, useRef } from "react";
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

// A press only counts as a muscle selection if it was short and stayed put —
// otherwise it was someone dragging to orbit the body, and releasing over a
// muscle should not select it.
const CLICK_MAX_MS = 250;
const CLICK_MAX_DRIFT_PX = 6;

const HOVER_RADIUS = 0.2;
const HOVER_STRENGTH = 0.28;
const HOVER_JITTER = 0.08;
const EASE_IN = 16;
const EASE_OUT = 7;

// The bubble sits exactly on the cursor, so voxels it abandons would drop back
// to rest the instant the cursor outruns them. A second bubble trails the first
// and holds those voxels up while they settle. It contributes nothing while it
// sits on top of the leader — only the gap between them gives it weight.
const TRAIL_FOLLOW = 14;
// Past this gap the trail would have to plough a trench across the body to catch
// up, so it fades out where it stands and re-seats on the cursor instead.
const TRAIL_JUMP_DIST = 0.6;
const TRAIL_FADE_EASE = 14;
const TRAIL_FADE_EPS = 0.02;

const FLY_SPEED = 2.5;
const FLY_ARRIVE_THRESHOLD = 0.05;
const FLY_ZOOM_DISTANCE = 8;
const FLY_TARGET_DURATION = 1.5;

const FADE_SPEED = 4.0;        // lerp speed for dim transition
const DIM_AMOUNT = 0.92;       // how far toward grey (0 = no change, 1 = full grey)

type SharedUniforms = {
  uHoverCenter: { value: THREE.Vector3 };
  uHoverRadius: { value: number };
  uHoverStrength: { value: number };
  uTrailCenter: { value: THREE.Vector3 };
  uTrailStrength: { value: number };
  uHoverJitter: { value: number };
};

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

type DimUniform = { value: number };

// The voxel displacement, shared by the face material and the edge material so
// an edge always travels with its cube.
const HOVER_VERTEX_COMMON = `#include <common>
  attribute vec3 voxelCenter;
  uniform vec3 uHoverCenter;
  uniform float uHoverRadius;
  uniform float uHoverStrength;
  uniform vec3 uTrailCenter;
  uniform float uTrailStrength;
  uniform float uHoverJitter;

  vec3 groupVoxelRand( vec3 p ) {
    float h  = fract( sin( dot( p, vec3( 12.9898, 78.233, 37.719 ) ) ) * 43758.5453 );
    float h2 = fract( sin( dot( p, vec3( 39.3468, 11.135, 83.155 ) ) ) * 24634.6345 );
    float h3 = fract( sin( dot( p, vec3( 93.9898, 67.345, 28.123 ) ) ) * 93726.1234 );
    return normalize( vec3( h, h2, h3 ) * 2.0 - 1.0 );
  }

  vec3 hoverPush( vec3 voxel, vec3 center, float strength ) {
    if ( uHoverRadius <= 0.0 || strength <= 0.0 ) return vec3( 0.0 );
    vec3 delta = voxel - center;
    float d = length( delta );
    if ( d >= uHoverRadius ) return vec3( 0.0 );
    float f = 1.0 - d / uHoverRadius;
    f = f * f;
    vec3 radial = d > 0.0001 ? delta / d : vec3( 0.0, 1.0, 0.0 );
    vec3 rnd = groupVoxelRand( voxel );
    vec3 dir = normalize( radial + rnd * uHoverJitter );
    float mag = 0.6 + fract( rnd.x * 7.31 + rnd.y * 13.17 ) * 0.8;
    return dir * f * strength * mag;
  }`;

const HOVER_VERTEX_BEGIN = `vec3 transformed = vec3( position );
  transformed += hoverPush( voxelCenter, uHoverCenter, uHoverStrength );
  transformed += hoverPush( voxelCenter, uTrailCenter, uTrailStrength );`;

type GroupGeometry = { geometry: THREE.BufferGeometry; edgeGeo: THREE.BufferGeometry };

/**
 * Builds the geometry for one muscle group. Pure vertex data — no materials, so
 * the result is safe to cache across mounts (see `getGroupGeometries`).
 */
function buildGroupGeometry(
  grid: HeadGrid,
  r: number, g: number, b: number,
): GroupGeometry {
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
  const edgeCenters = new Float32Array(count * 12 * 2 * 3);
  let ei = 0;
  for (let i = 0; i < grid.cells.length; i++) {
    const c = grid.cells[i];
    for (const [a, b] of EDGE_PAIRS) {
      edgeCenters[ei + 0] = c.x; edgeCenters[ei + 1] = c.y; edgeCenters[ei + 2] = c.z;
      edgeCenters[ei + 3] = c.x; edgeCenters[ei + 4] = c.y; edgeCenters[ei + 5] = c.z;
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
  edgeGeo.setAttribute("voxelCenter", new THREE.BufferAttribute(edgeCenters, 3));

  return { geometry, edgeGeo };
}

/**
 * Wraps cached geometry in freshly-created materials. Materials are per-mount
 * because they carry this screen's hover + dim uniforms; geometry is shared.
 */
function createGroupMesh(
  { geometry, edgeGeo }: GroupGeometry,
  sharedUniforms: SharedUniforms,
  dimUniform: DimUniform,
): THREE.Mesh {
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
        HOVER_VERTEX_COMMON,
      )
      .replace(
        "#include <begin_vertex>",
        HOVER_VERTEX_BEGIN,
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

  const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 });
  edgeMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sharedUniforms);
    shader.uniforms.uDim = dimUniform;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        HOVER_VERTEX_COMMON,
      )
      .replace(
        "#include <begin_vertex>",
        HOVER_VERTEX_BEGIN,
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

function buildRaycastGeometry(entries: ReturnType<typeof buildGroupGrids>): THREE.BufferGeometry {
  if (entries.length === 0) return new THREE.BufferGeometry();

  const voxelSize = entries[0].grid.voxelSize;
  const invV = 1 / voxelSize;
  const half = voxelSize * 0.5;

  // Encode (ix, iy, iz) as a single integer key. Each axis fits in ±1024 for
  // any realistic body voxel grid (dims are 136×192×120).
  const B = 2048;
  const pack = (ix: number, iy: number, iz: number) =>
    (ix + 1024) + (iy + 1024) * B + (iz + 1024) * B * B;

  // Pass 1: insert every occupied cell into a hash set
  const occupied = new Set<number>();
  for (const { grid } of entries) {
    for (const c of grid.cells) {
      occupied.add(pack(
        Math.round(c.x * invV - 0.5),
        Math.round(c.y * invV - 0.5),
        Math.round(c.z * invV - 0.5),
      ));
    }
  }

  // Pass 2: emit only exterior faces (faces whose neighbor cell is absent)
  const positions: number[] = [];
  const indices: number[] = [];
  let vert = 0;

  for (const { grid } of entries) {
    for (const c of grid.cells) {
      const ix = Math.round(c.x * invV - 0.5);
      const iy = Math.round(c.y * invV - 0.5);
      const iz = Math.round(c.z * invV - 0.5);

      for (let f = 0; f < FACES.length; f++) {
        const n = FACES[f].normal;
        if (occupied.has(pack(ix + n[0], iy + n[1], iz + n[2]))) continue;

        const base = vert;
        for (const corner of FACES[f].corners) {
          positions.push(c.x + corner[0] * half, c.y + corner[1] * half, c.z + corner[2] * half);
          vert++;
        }
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
  geo.computeBoundingSphere();

  return geo;
}

/* ------------------------------------------------------------------ *
 * Module-level cache.
 *
 * VoxelBrain is mounted by four different screens, and every mount used to
 * rebuild all 62k voxels from scratch: ~112 MB of typed arrays, thrown away
 * again on unmount. None of that data varies, so it is built at most once per
 * page load and shared by every mount. Materials are still per-mount (they
 * hold each screen's hover/dim uniforms), and the cached geometry is never
 * disposed — hence `dispose={null}` on the primitives that use it.
 * ------------------------------------------------------------------ */

type GroupCache = {
  entries: ReturnType<typeof buildGroupGrids>;
  geometries: Array<{ name: string; geo: GroupGeometry }>;
  raycastGeometry: THREE.BufferGeometry;
  lookup: {
    map: Map<number, string>;
    inv: number;
    voxelSize: number;
    pack: (ix: number, iy: number, iz: number) => number;
  } | null;
};

let _voxelCache: GroupCache | null = null;

function getVoxelCache(): GroupCache {
  if (_voxelCache) return _voxelCache;

  const entries = buildGroupGrids();

  const color = new THREE.Color();
  const geometries = entries.map(({ name, grid }, i) => {
    const hex = GROUP_COLORS[name];
    if (hex) color.set(hex);
    else color.setHSL((i / entries.length) % 1, 0.7, 0.55);
    return { name, geo: buildGroupGeometry(grid, color.r, color.g, color.b) };
  });

  const raycastGeometry = buildRaycastGeometry(entries);

  // Spatial hash: packed voxel index → group name for O(1) click lookup
  let lookup: GroupCache["lookup"] = null;
  if (entries.length > 0) {
    const voxelSize = entries[0].grid.voxelSize;
    const inv = 1 / voxelSize;
    const B = 2048;
    const pack = (ix: number, iy: number, iz: number) =>
      (ix + 1024) + (iy + 1024) * B + (iz + 1024) * B * B;
    const map = new Map<number, string>();
    for (const { name, grid } of entries) {
      for (const c of grid.cells) {
        map.set(pack(Math.floor(c.x * inv), Math.floor(c.y * inv), Math.floor(c.z * inv)), name);
      }
    }
    lookup = { map, inv, voxelSize, pack };
  }

  _voxelCache = { entries, geometries, raycastGeometry, lookup };
  return _voxelCache;
}

/**
 * Builds the voxel data ahead of time so the first screen that shows the model
 * does not pay for it. Safe to call repeatedly; work happens only once.
 */
export function preloadVoxelModel(): void {
  getVoxelCache();
}

let _bodyYBounds: { min: number; max: number } | null = null;
function getBodyYBounds(): { min: number; max: number } {
  if (_bodyYBounds) return _bodyYBounds;
  let min = Infinity;
  let max = -Infinity;
  for (const entry of buildGroupGrids()) {
    const half = entry.grid.voxelSize * 0.5;
    for (const c of entry.grid.cells) {
      if (c.y - half < min) min = c.y - half;
      if (c.y + half > max) max = c.y + half;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    _bodyYBounds = { min: -Infinity, max: Infinity };
  } else {
    _bodyYBounds = { min, max };
  }
  return _bodyYBounds;
}

// Scratch for the camera fly, reused each frame rather than reallocated.
const _flySphCur = new THREE.Spherical();
const _flySphEnd = new THREE.Spherical();
const _flyOffset = new THREE.Vector3();
const TWO_PI = Math.PI * 2;

type FlyState = {
  active: boolean;
  target: THREE.Vector3;
  camTarget: THREE.Vector3;
  arrived: boolean;
  speed: number;
};

type ManProps = {
  focusGroup: string | null;
  flyState: React.MutableRefObject<FlyState>;
  orbitRef: React.MutableRefObject<any>;
  onBearPosition?: (pos: { x: number; y: number } | null) => void;
  onGroupClick?: (group: string) => void;
};

function Man({ focusGroup, flyState, orbitRef, onBearPosition, onGroupClick }: ManProps) {
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
      uTrailCenter: { value: new THREE.Vector3(0, -1000, 0) },
      uTrailStrength: { value: 0 },
      uHoverJitter: { value: HOVER_JITTER },
    };
  }
  const sharedUniforms = sharedUniformsRef.current;
  const trailFade = useRef(1);

  // One dim uniform per group mesh (0 = full colour, 1 = full grey)
  const dimUniformsRef = useRef<Map<string, DimUniform>>(new Map());

  const cache = getVoxelCache();
  const groupLookup = cache.lookup;

  const raycastMesh = useMemo(
    () => new THREE.Mesh(
      cache.raycastGeometry,
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
    ),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  const groupMeshes = useMemo(() => {
    return cache.geometries.map(({ name, geo }) => {
      // Create per-mesh dim uniform, starting at 0 (full colour)
      if (!dimUniformsRef.current.has(name)) {
        dimUniformsRef.current.set(name, { value: 0.0 });
      }
      const dimUniform = dimUniformsRef.current.get(name)!;

      return { name, mesh: createGroupMesh(geo, sharedUniforms, dimUniform) };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cached geometry outlives this mount, so only the per-mount materials are
  // disposed here.
  useEffect(() => {
    return () => {
      for (const { mesh } of groupMeshes) {
        (mesh.material as THREE.Material).dispose();
        for (const child of mesh.children) {
          if (child instanceof THREE.LineSegments) child.material.dispose();
        }
      }
      (raycastMesh.material as THREE.Material).dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { camera, size } = useThree();
  const bearPosRef = useRef<{ x: number; y: number } | null>(null);

  useFrame((_, dt) => {
    // --- Camera fly-to ---
    const fly = flyState.current;
    if (fly.active && !fly.arrived) {
      if (fly.speed <= 0) {
        const dist = camera.position.distanceTo(fly.camTarget);
        const decayCount = Math.log(Math.max(dist, FLY_ARRIVE_THRESHOLD) / FLY_ARRIVE_THRESHOLD);
        fly.speed = Math.max(FLY_SPEED, decayCount / FLY_TARGET_DURATION);
      }
      const t = 1 - Math.exp(-fly.speed * dt);
      // No y clamp here: fly.camTarget.y is already clamped to the body when the
      // fly is created, so the flight lands in range on its own. Clamping the
      // in-flight position instead snapped the camera down in a single frame
      // whenever the view started above or below the body.
      const pivot = orbitRef.current?.target as THREE.Vector3 | undefined;
      if (pivot) {
        // Orbit around the body rather than lerping the position straight
        // there. A straight line between two viewpoints passes far nearer the
        // body than either end, so the camera used to cut inward and the view
        // whipped around as it swept past the pivot — and because front and
        // back groups sit almost opposite each other, their shared upward tilt
        // sent that path over the head.
        _flySphCur.setFromVector3(_flyOffset.copy(camera.position).sub(pivot));
        _flySphEnd.setFromVector3(_flyOffset.copy(fly.camTarget).sub(fly.target));

        pivot.lerp(fly.target, t);

        // Take the short way around, and interpolate the polar angle straight
        // so the arc stays between the two heights instead of over the top.
        let dTheta = _flySphEnd.theta - _flySphCur.theta;
        if (dTheta > Math.PI) dTheta -= TWO_PI;
        else if (dTheta < -Math.PI) dTheta += TWO_PI;

        _flySphCur.theta += dTheta * t;
        _flySphCur.phi += (_flySphEnd.phi - _flySphCur.phi) * t;
        _flySphCur.radius += (_flySphEnd.radius - _flySphCur.radius) * t;
        _flySphCur.makeSafe();
        camera.position.copy(pivot).add(_flyOffset.setFromSpherical(_flySphCur));
        orbitRef.current.update();
      } else {
        camera.position.lerp(fly.camTarget, t);
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
    // The lead bubble sits exactly on the cursor — anything else reads as lag.
    const target = hoverTarget.current;
    sharedUniforms.uHoverCenter.value.copy(target.center);
    const ease = target.radius > sharedUniforms.uHoverRadius.value ? EASE_IN : EASE_OUT;
    const t2 = 1 - Math.exp(-ease * dt);
    sharedUniforms.uHoverRadius.value += (target.radius - sharedUniforms.uHoverRadius.value) * t2;
    sharedUniforms.uHoverStrength.value += (target.strength - sharedUniforms.uHoverStrength.value) * t2;

    // The trail chases the cursor from behind, holding up the voxels the lead
    // bubble has already left so they settle instead of dropping in one frame.
    const trail = sharedUniforms.uTrailCenter.value;
    let gap = trail.distanceTo(target.center);
    // Faded out and far from the cursor — nothing is displaced here any more, so
    // the trail can be re-seated without anything visibly moving.
    if (trailFade.current < TRAIL_FADE_EPS && gap > TRAIL_JUMP_DIST) {
      trail.copy(target.center);
      gap = 0;
    }
    // A cursor that teleports (a flick, an orbit swinging the body underneath,
    // one limb sliding in front of another) leaves the trail too far behind to
    // follow, so it fades where it stands rather than dragging across the body.
    const stranded = gap > TRAIL_JUMP_DIST;
    if (!stranded) trail.lerp(target.center, 1 - Math.exp(-TRAIL_FOLLOW * dt));
    const fadeEase = stranded ? TRAIL_FADE_EASE : EASE_IN;
    trailFade.current += ((stranded ? 0 : 1) - trailFade.current) * (1 - Math.exp(-fadeEase * dt));

    // Weight by the gap, so a trail sitting on top of the lead adds nothing and
    // the hold fades out on its own as the trail catches up.
    sharedUniforms.uTrailStrength.value =
      sharedUniforms.uHoverStrength.value * smoothstep(0, HOVER_RADIUS, gap) * trailFade.current;

    // --- Project focused group centroid to screen for bear overlay ---
    if (onBearPosition) {
      if (!focusGroup) {
        if (bearPosRef.current !== null) { bearPosRef.current = null; onBearPosition(null); }
      } else {
        const focus = computeGroupFocus(focusGroup);
        if (focus) {
          const projected = focus.center.clone().project(camera);
          const sx = ((projected.x + 1) / 2) * size.width;
          const sy = ((-projected.y + 1) / 2) * size.height;
          const prev = bearPosRef.current;
          if (!prev || Math.abs(prev.x - sx) > 1 || Math.abs(prev.y - sy) > 1) {
            bearPosRef.current = { x: sx, y: sy };
            onBearPosition({ x: sx, y: sy });
          }
        }
      }
    }
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

  const pressRef = useRef<{ t: number; x: number; y: number } | null>(null);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    pressRef.current = { t: performance.now(), x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    const press = pressRef.current;
    pressRef.current = null;
    if (!press) return;

    // Deliberate click, or the tail end of an orbit drag?
    const heldMs = performance.now() - press.t;
    const drift = Math.hypot(e.clientX - press.x, e.clientY - press.y);
    if (heldMs > CLICK_MAX_MS || drift > CLICK_MAX_DRIFT_PX) return;

    e.stopPropagation();
    hoverTarget.current.radius = 0;
    hoverTarget.current.strength = 0;
    if (!onGroupClick || !groupLookup) return;
    const { map, inv, voxelSize, pack } = groupLookup;
    // Shift the hit point inward by 40% of voxelSize along the face normal so we
    // land inside the owning voxel rather than on its outer boundary.
    const inset = voxelSize * 0.4;
    const n = e.face?.normal;
    const px = e.point.x - (n ? n.x * inset : 0);
    const py = e.point.y - (n ? n.y * inset : 0);
    const pz = e.point.z - (n ? n.z * inset : 0);
    const group = map.get(pack(Math.floor(px * inv), Math.floor(py * inv), Math.floor(pz * inv)));
    if (group) onGroupClick(group);
  };

  return (
    <>
      {groupMeshes.map(({ name, mesh }) => (
        <primitive key={name} object={mesh} dispose={null} />
      ))}
      <primitive
        object={raycastMesh}
        dispose={null}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />
    </>
  );
}

type SceneProps = {
  focusGroup: string | null;
  resetSignal?: number;
  autoRotate?: boolean;
  onBearPosition?: (pos: { x: number; y: number } | null) => void;
  onGroupClick?: (group: string) => void;
};

function Scene({ focusGroup, resetSignal = 0, autoRotate = false, onBearPosition, onGroupClick }: SceneProps) {
  const orbitRef = useRef<any>(null);

  const flyState = useRef<FlyState>({
    active: false,
    target: new THREE.Vector3(0, 0.3, 0),
    camTarget: new THREE.Vector3(10, 0.3, 10),
    arrived: true,
    speed: 0,
  });

  const prevFocusGroup = useRef<string | null>(null);
  // Bumping resetSignal flies the camera home even when the selection does not
  // change — otherwise "reset view" does nothing at all with no group selected,
  // which is exactly when someone has orbited off and wants the default back.
  const prevResetSignal = useRef(resetSignal);
  const resetRequested = resetSignal !== prevResetSignal.current;
  if (focusGroup !== prevFocusGroup.current || resetRequested) {
    prevFocusGroup.current = focusGroup;
    prevResetSignal.current = resetSignal;

    if (focusGroup && !resetRequested) {
      const focus = computeGroupFocus(focusGroup);
      if (focus) {
        const camPos = focus.center.clone().addScaledVector(focus.dir, FLY_ZOOM_DISTANCE);
        const { min: yMin, max: yMax } = getBodyYBounds();
        camPos.y = Math.max(yMin, Math.min(yMax, camPos.y));
        flyState.current = { active: true, arrived: false, target: focus.center.clone(), camTarget: camPos, speed: 0 };
        if (orbitRef.current) orbitRef.current.enabled = false;
      }
    } else {
      flyState.current = {
        active: true,
        arrived: false,
        target: new THREE.Vector3(0, 0.3, 0),
        camTarget: new THREE.Vector3(7, 0.3, 7),
        speed: 0,
      };
      if (orbitRef.current) orbitRef.current.enabled = false;
    }
  }

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[-6, 8,  6]} intensity={0.6} />
      <directionalLight position={[ 6, 6, -6]} intensity={0.6} />
      <Man focusGroup={focusGroup} flyState={flyState} orbitRef={orbitRef} onBearPosition={onBearPosition} onGroupClick={onGroupClick} />
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
  /** Change this value to fly the camera back to the default view. */
  resetSignal?: number;
  autoRotate?: boolean;
  style?: React.CSSProperties;
  onBearPosition?: (pos: { x: number; y: number } | null) => void;
  onGroupClick?: (group: string) => void;
  /**
   * Fired when a click lands on empty space rather than the body. Overlay DOM
   * panels never reach the canvas, so they do not count as a miss — unless they
   * set `pointerEvents: none`, which lets the click straight through to here.
   */
  onBackgroundClick?: () => void;
};

export default function VoxelBrain({ focusGroup = null, resetSignal = 0, autoRotate = false, style, onBearPosition, onGroupClick, onBackgroundClick }: VoxelBrainProps) {
  return (
    <Canvas
      camera={{ position: [7, 0.3, 7], fov: 42, near: 0.5, far: 80 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      style={{ background: "transparent", ...style }}
      // Only fires when the click hit nothing and the pointer barely moved
      // since it went down, so releasing an orbit drag over empty space does
      // not count as a click.
      onPointerMissed={onBackgroundClick ? () => onBackgroundClick() : undefined}
    >
      <Scene focusGroup={focusGroup} resetSignal={resetSignal} autoRotate={autoRotate} onBearPosition={onBearPosition} onGroupClick={onGroupClick} />
    </Canvas>
  );
}
