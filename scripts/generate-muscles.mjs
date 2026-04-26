import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '../frontend/public/voxels')

mkdirSync(OUT_DIR, { recursive: true })

function generateEllipsoid(cx, cy, cz, rx, ry, rz, voxelSize = 0.06) {
  const data = []
  for (let x = cx - rx; x <= cx + rx; x += voxelSize) {
    for (let y = cy - ry; y <= cy + ry; y += voxelSize) {
      for (let z = cz - rz; z <= cz + rz; z += voxelSize) {
        const inside = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1
        if (inside)
          data.push(
            +x.toFixed(4), +y.toFixed(4), +z.toFixed(4),
            +(Math.random() * 0.3 + 0.5).toFixed(3)
          )
      }
    }
  }
  return { dims: [68, 96, 60], voxelSize, data }
}

const muscles = [
  // id                  cx     cy     cz     rx    ry    rz
  ['trapezius_left',   -0.3,  4.1,  -0.1,  0.35, 0.45, 0.12],
  ['trapezius_right',   0.3,  4.1,  -0.1,  0.35, 0.45, 0.12],
  ['rhomboid_left',    -0.25, 3.9,  -0.15, 0.2,  0.25, 0.1 ],
  ['rhomboid_right',    0.25, 3.9,  -0.15, 0.2,  0.25, 0.1 ],
  ['erector_left',     -0.15, 3.2,  -0.12, 0.12, 0.6,  0.1 ],
  ['erector_right',     0.15, 3.2,  -0.12, 0.12, 0.6,  0.1 ],
  ['lat_left',         -0.45, 3.3,  -0.05, 0.2,  0.5,  0.15],
  ['lat_right',         0.45, 3.3,  -0.05, 0.2,  0.5,  0.15],
  ['deltoid_left',     -0.7,  4.0,   0.0,  0.18, 0.25, 0.18],
  ['deltoid_right',     0.7,  4.0,   0.0,  0.18, 0.25, 0.18],
  ['rotator_left',     -0.65, 4.05, -0.1,  0.15, 0.2,  0.12],
  ['rotator_right',     0.65, 4.05, -0.1,  0.15, 0.2,  0.12],
  ['glute_left',       -0.25, 2.3,  -0.2,  0.28, 0.3,  0.22],
  ['glute_right',       0.25, 2.3,  -0.2,  0.28, 0.3,  0.22],
  ['quad_left',        -0.2,  1.5,   0.1,  0.18, 0.55, 0.15],
  ['quad_right',        0.2,  1.5,   0.1,  0.18, 0.55, 0.15],
  ['hamstring_left',   -0.2,  1.5,  -0.15, 0.16, 0.5,  0.14],
  ['hamstring_right',   0.2,  1.5,  -0.15, 0.16, 0.5,  0.14],
]

for (const [id, cx, cy, cz, rx, ry, rz] of muscles) {
  const result = generateEllipsoid(cx, cy, cz, rx, ry, rz)
  const voxelCount = result.data.length / 4
  writeFileSync(join(OUT_DIR, `${id}.json`), JSON.stringify(result))
  const pad = id.padEnd(18)
  console.log(`${pad} → ${voxelCount} voxels ✓`)
}
