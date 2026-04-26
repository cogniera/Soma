import bpy

# ─── Region definitions ───────────────────────────────────────────────────────
# Confirmed axes:
#   X: -0.3506 → +0.3506  (X positive = anatomical left, X negative = anatomical right)
#   Y: -0.1409 → +0.1950  (Y POSITIVE = back, Y NEGATIVE = front)
#   Z:  0.00   → +1.80
#
# Z landmarks derived from diagnostic (back vert density):
#   0.00–0.04  feet
#   0.04–0.44  lower leg (zero back-surface verts = shins/calves only)
#   0.44–0.90  upper leg / thigh  (back verts appear at 0.44)
#   0.85–1.00  glutes / hip
#   0.90–1.25  lower torso (erectors, abs, obliques)
#   1.10–1.45  mid/upper torso (lats, rhomboids, pecs)
#   1.25–1.48  upper back / traps / pecs
#   1.30–1.50  shoulders / deltoids
#   1.49+      neck / head (excluded)
#
# (name, x_min, x_max, y_min, y_max, z_min, z_max)
REGIONS = [

    # ── HEAD / NECK ───────────────────────────────────────────────────────────

    # Face — front of head, Z 1.60–1.80
    ('face',               -0.20,  0.20,  -0.20,  0.05,   1.60,  1.80),

    # Neck — full cylinder, narrow X, Z 1.48–1.62
    ('neck',               -0.10,  0.10,  -0.15,  0.15,   1.48,  1.62),

    # ── UPPER BACK — traps + rhomboids merged ─────────────────────────────────
    ('upper_back_left',    0.01,   0.36,   0.0,   0.15,   1.15,  1.48),
    ('upper_back_right',  -0.36,  -0.01,   0.0,   0.15,   1.15,  1.48),

    # ── LOWER BACK — lats + erectors merged ───────────────────────────────────
    ('lower_back_left',    0.01,   0.36,   0.0,   0.15,   0.90,  1.20),
    ('lower_back_right',  -0.36,  -0.01,   0.0,   0.15,   0.90,  1.20),

    # ── DELTOIDS ──────────────────────────────────────────────────────────────
    ('deltoid_left',       0.22,   0.36,  -0.15,  0.15,   1.35,  1.52),
    ('deltoid_right',     -0.36,  -0.22,  -0.15,  0.15,   1.35,  1.52),

    # ── ARMS — bicep + tricep merged, full front-to-back ─────────────────────
    ('arm_left',           0.25,   0.36,  -0.20,  0.15,   1.05,  1.40),
    ('arm_right',         -0.36,  -0.25,  -0.20,  0.15,   1.05,  1.40),

    # ── CHEST / PECS ──────────────────────────────────────────────────────────
    ('pec_left',           0.01,   0.30,  -0.20,  0.0,    1.20,  1.48),
    ('pec_right',         -0.30,  -0.01,  -0.20,  0.0,    1.20,  1.48),

    # ── ABS ───────────────────────────────────────────────────────────────────
    ('abs_left',           0.01,   0.14,  -0.20,  0.0,    0.95,  1.22),
    ('abs_right',         -0.14,  -0.01,  -0.20,  0.0,    0.95,  1.22),

    # ── OBLIQUES ──────────────────────────────────────────────────────────────
    ('oblique_left',       0.12,   0.36,  -0.20,  0.0,    0.90,  1.20),
    ('oblique_right',     -0.36,  -0.12,  -0.20,  0.0,    0.90,  1.20),

    # ── HIP / LOWER ABS ───────────────────────────────────────────────────────
    ('hip_left',           0.01,   0.22,  -0.20,  0.0,    0.78,  0.96),
    ('hip_right',         -0.22,  -0.01,  -0.20,  0.0,    0.78,  0.96),

    # ── GLUTES — shifted up ───────────────────────────────────────────────────
    ('glute_left',         0.01,   0.36,   0.02,  0.15,   0.82,  1.05),
    ('glute_right',       -0.36,  -0.01,   0.02,  0.15,   0.82,  1.05),

    # ── HAMSTRINGS — shifted up ───────────────────────────────────────────────
    ('hamstring_left',     0.01,   0.22,   0.02,  0.15,   0.52,  0.85),
    ('hamstring_right',   -0.22,  -0.01,   0.02,  0.15,   0.52,  0.85),

    # ── QUADS ─────────────────────────────────────────────────────────────────
    ('quad_left',          0.01,   0.22,  -0.20, -0.01,   0.48,  0.82),
    ('quad_right',        -0.22,  -0.01,  -0.20, -0.01,   0.48,  0.82),

    # ── CALVES ────────────────────────────────────────────────────────────────
    ('calf_left',          0.01,   0.15,   0.02,  0.15,   0.04,  0.44),
    ('calf_right',        -0.15,  -0.01,   0.02,  0.15,   0.04,  0.44),

    # ── SHINS ─────────────────────────────────────────────────────────────────
    ('shin_left',          0.01,   0.15,  -0.20, -0.01,   0.04,  0.44),
    ('shin_right',        -0.15,  -0.01,  -0.20, -0.01,   0.04,  0.44),
]

# ─── Helpers ──────────────────────────────────────────────────────────────────

def join_all_meshes():
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT')
    mesh_objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not mesh_objects:
        raise RuntimeError("No mesh objects found in the scene.")
    print(f"  Joining {len(mesh_objects)} mesh object(s): {[o.name for o in mesh_objects]}")
    for o in mesh_objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objects[0]
    if len(mesh_objects) > 1:
        bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = 'body_joined'
    joined.data.name = 'body_joined_mesh'
    print(f"  Joined into: {joined.name!r}  ({len(joined.data.vertices)} vertices)\n")
    return joined


def print_bounding_box(obj):
    mat    = obj.matrix_world
    coords = [mat @ v.co for v in obj.data.vertices]
    xs = [v.x for v in coords]
    ys = [v.y for v in coords]
    zs = [v.z for v in coords]
    print(f"\n{'─'*52}")
    print(f"  Mesh bounding box: {obj.name!r}")
    print(f"  X  {min(xs):+.4f}  →  {max(xs):+.4f}")
    print(f"  Y  {min(ys):+.4f}  →  {max(ys):+.4f}   (neg=back, pos=front)")
    print(f"  Z  {min(zs):+.4f}  →  {max(zs):+.4f}   (0=feet, 1.80=head)")
    print(f"{'─'*52}\n")


def vertex_in_region(world_co, region):
    _name, x_min, x_max, y_min, y_max, z_min, z_max = region
    x, y, z = world_co.x, world_co.y, world_co.z
    return (x_min <= x <= x_max and
            y_min <= y <= y_max and
            z_min <= z <= z_max)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    src = join_all_meshes()

    print(f"\n{'='*52}")
    print(f"  Source object: {src.name!r}  ({len(src.data.vertices)} vertices)")
    print_bounding_box(src)
    print("  Starting region split…\n")

    results = []

    for region in REGIONS:
        name = region[0]

        bpy.ops.object.mode_set(mode='OBJECT')
        bpy.ops.object.select_all(action='DESELECT')
        src.select_set(True)
        bpy.context.view_layer.objects.active = src

        mat   = src.matrix_world
        count = 0
        for v in src.data.vertices:
            world_co = mat @ v.co
            if vertex_in_region(world_co, region):
                v.select = True
                count += 1
            else:
                v.select = False

        if count == 0:
            print(f"  WARNING  {name!r:<28} — 0 vertices, skipping.")
            results.append((name, 0))
            continue

        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.separate(type='SELECTED')
        bpy.ops.object.mode_set(mode='OBJECT')

        new_obj = None
        for o in bpy.context.selected_objects:
            if o is not src:
                new_obj = o
                break

        if new_obj is None:
            print(f"  ERROR    {name!r:<28} — separation failed.")
            results.append((name, -1))
            continue

        new_obj.name      = name
        new_obj.data.name = name + '_mesh'

        vcount = len(new_obj.data.vertices)
        results.append((name, vcount))
        print(f"  OK       {name!r:<28}  {vcount:>6} vertices")

        bpy.ops.object.select_all(action='DESELECT')
        src.select_set(True)
        bpy.context.view_layer.objects.active = src

    # Summary
    print(f"\n{'─'*52}")
    print("  SUMMARY")
    print(f"{'─'*52}")
    warnings = 0
    for name, vc in results:
        if vc <= 0:
            tag = "  !! NO VERTICES" if vc == 0 else "  !! FAILED"
            warnings += 1
        else:
            tag = ""
        print(f"  {name:<28}  {vc:>6} verts{tag}")

    print(f"\n  Remaining in source ({src.name!r}): {len(src.data.vertices)} vertices")
    print(f"  Regions with issues: {warnings}")
    print(f"{'='*52}\n")


main()
