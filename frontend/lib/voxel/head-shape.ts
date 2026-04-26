import headCells from "./head-cells.json";
import brainCells from "./brain-cells.json";
import groupCellsRaw from "./group-cells.json";

export type Cell = {
  index: number;
  x: number;
  y: number;
  z: number;
  tone: number;
};

export type HeadGrid = {
  dims: [number, number, number];
  voxelSize: number;
  cells: Cell[];
};

type Raw = {
  dims: [number, number, number];
  voxelSize: number;
  data: number[];
};

type GroupRaw = {
  dims: [number, number, number];
  voxelSize: number;
  groups: Record<string, number[]>;
};

export type GroupEntry = { name: string; grid: HeadGrid };

function parseGrid(raw: Raw): HeadGrid {
  const cells: Cell[] = [];
  for (let i = 0; i < raw.data.length; i += 4) {
    cells.push({
      index: i / 4,
      x: raw.data[i],
      y: raw.data[i + 1],
      z: raw.data[i + 2],
      tone: raw.data[i + 3],
    });
  }
  return { dims: raw.dims, voxelSize: raw.voxelSize, cells };
}

/**
 * Outer bust silhouette — full head + torso. Produced by
 * `scripts/voxelize-stl.mjs` from the STL in `public/`. Rendered as a
 * translucent shell in VoxelBrain so you can see the brain voxels inside.
 */
export function buildHeadGrid(): HeadGrid {
  return parseGrid(headCells as Raw);
}

/**
 * Inner brain silhouette — sits inside the skull region of the head
 * grid. Produced by `scripts/voxelize-brain.mjs`. Each cell carries a
 * knowledge-graph node assignment and drives the colored-region /
 * blast / OOD interactions.
 */
export function buildBrainGrid(): HeadGrid {
  return parseGrid(brainCells as Raw);
}

/**
 * Per-group voxel grids produced by `scripts/voxelize-groups.mjs`.
 * Each entry is a named group (e.g. a muscle group) from the source OBJ.
 */
// Groups to merge: { target: groups that get absorbed into it }
const MERGE_INTO: Record<string, string> = {
  Adductors:  "Quads",
  Biceps:     "Arms",
  Triceps:    "Arms",
  Upper_Trap: "Lower_Trap",
  Lower_Trap: "Upper_Trap",
};

const EXCLUDE = new Set<string>();

export function buildGroupGrids(): GroupEntry[] {
  const raw = groupCellsRaw as unknown as GroupRaw;
  const merged: Record<string, number[]> = {};

  for (const [name, data] of Object.entries(raw.groups)) {
    if (EXCLUDE.has(name)) continue;
    const target = MERGE_INTO[name] ?? name;
    if (merged[target]) merged[target] = merged[target].concat(data);
    else merged[target] = [...data];
  }

  return Object.entries(merged).map(([name, data]) => ({
    name,
    grid: parseGrid({ dims: raw.dims, voxelSize: raw.voxelSize, data }),
  }));
}
