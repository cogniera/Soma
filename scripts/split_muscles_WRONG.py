import bpy
import bmesh

# ─── Region definitions ───────────────────────────────────────────────────────
# (name, x_min, x_max, y_min, y_max, z_min, z_max)
REGIONS = [
    ('trapezius_left',    -0.5,   0.0,   -0.2,   0.1,    1.2,   1.6),
    ('trapezius_right',    0.0,   0.5,   -0.2,   0.1,    1.2,   1.6),
    ('rhomboid_left',     -0.4,   0.0,   -0.2,   0.0,    1.1,   1.4),
    ('rhomboid_right',     0.0,   0.4,   -0.2,   0.0,    1.1,   1.4),
    ('erector_left',      -0.2,   0.0,   -0.2,   0.0,    0.6,   1.3),
    ('erector_right',      0.0,   0.2,   -0.2,   0.0,    0.6,   1.3),
    ('lat_left',          -0.5,  -0.1,   -0.1,   0.2,    0.7,   1.2),
    ('lat_right',          0.1,   0.5,   -0.1,   0.2,    0.7,   1.2),
    ('deltoid_left',      -0.6,  -0.3,   -0.1,   0.2,    1.3,   1.6),
    ('deltoid_right',      0.3,   0.6,   -0.1,   0.2,    1.3,   1.6),
    ('glute_left',        -0.4,   0.0,   -0.3,   0.0,    0.5,   0.85),
    ('glute_right',        0.0,   0.4,   -0.3,   0.0,    0.5,   0.85),
    ('quad_left',         -0.3,   0.0,    0.0,   0.25,   0.0,   0.55),
    ('quad_right',         0.0,   0.3,    0.0,   0.25,   0.0,   0.55),
    ('hamstring_left',    -0.3,   0.0,   -0.25,  0.0,    0.0,   0.55),
    ('hamstring_right',    0.0,   0.3,   -0.25,  0.0,    0.0,   0.55),
]

# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_active_mesh():
    obj = bpy.context.active_object
    if obj is None or obj.type != 'MESH':
        # Fall back: find any mesh in the scene
        for o in bpy.context.scene.objects:
            if o.type == 'MESH':
                bpy.context.view_layer.objects.active = o
                return o
        raise RuntimeError("No mesh object found in the scene.")
    return obj


def print_bounding_box(obj):
    """Print the actual world-space bounds of the mesh so the user can
    verify the region coordinates before committing to a split."""
    mesh = obj.data
    mat  = obj.matrix_world

    xs = [mat @ v.co for v in mesh.vertices]
    if not xs:
        print("  (mesh has no vertices)")
        return

    coords = [(v.x, v.y, v.z) for v in xs]
    min_x = min(c[0] for c in coords)
    max_x = max(c[0] for c in coords)
    min_y = min(c[1] for c in coords)
    max_y = max(c[1] for c in coords)
    min_z = min(c[2] for c in coords)
    max_z = max(c[2] for c in coords)

    print(f"\n{'─'*52}")
    print(f"  Mesh bounding box: {obj.name!r}")
    print(f"  X  {min_x:+.4f}  →  {max_x:+.4f}   (width  {max_x-min_x:.4f})")
    print(f"  Y  {min_y:+.4f}  →  {max_y:+.4f}   (depth  {max_y-min_y:.4f})")
    print(f"  Z  {min_z:+.4f}  →  {max_z:+.4f}   (height {max_z-min_z:.4f})")
    print(f"{'─'*52}\n")


def vertex_in_region(world_co, region):
    _name, x_min, x_max, y_min, y_max, z_min, z_max = region
    x, y, z = world_co.x, world_co.y, world_co.z
    return (x_min <= x <= x_max and
            y_min <= y <= y_max and
            z_min <= z <= z_max)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    src = get_active_mesh()

    print(f"\n{'='*52}")
    print(f"  Source object: {src.name!r}  ({len(src.data.vertices)} vertices)")
    print_bounding_box(src)
    print("  Starting region split…\n")

    results = []   # (name, vertex_count)

    for region in REGIONS:
        name = region[0]

        # ── 1. Make the source the active selection ───────────────────────────
        bpy.ops.object.mode_set(mode='OBJECT')
        bpy.ops.object.select_all(action='DESELECT')
        src.select_set(True)
        bpy.context.view_layer.objects.active = src

        # ── 2. Enter edit mode and deselect everything ────────────────────────
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='DESELECT')

        # ── 3. Select vertices in region (via bmesh for accuracy) ─────────────
        bpy.ops.object.mode_set(mode='OBJECT')   # flush selection to mesh data
        mat = src.matrix_world
        count = 0
        for v in src.data.vertices:
            world_co = mat @ v.co
            if vertex_in_region(world_co, region):
                v.select = True
                count += 1
            else:
                v.select = False

        if count == 0:
            print(f"  WARNING  {name!r:<28} — 0 vertices selected, skipping.")
            results.append((name, 0))
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='DESELECT')
            bpy.ops.object.mode_set(mode='OBJECT')
            continue

        # ── 4. Separate selection ─────────────────────────────────────────────
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.separate(type='SELECTED')
        bpy.ops.object.mode_set(mode='OBJECT')

        # The newly separated object is now selected (and the source is no
        # longer selected after separate). Find it: it's the selected object
        # that is not src.
        new_obj = None
        for o in bpy.context.selected_objects:
            if o is not src:
                new_obj = o
                break

        if new_obj is None:
            print(f"  ERROR    {name!r:<28} — could not find separated object.")
            results.append((name, -1))
            continue

        # ── 5. Rename ─────────────────────────────────────────────────────────
        new_obj.name      = name
        new_obj.data.name = name + '_mesh'

        vcount = len(new_obj.data.vertices)
        results.append((name, vcount))
        print(f"  OK       {name!r:<28}  {vcount:>5} vertices")

        # Re-select src for next iteration
        bpy.ops.object.select_all(action='DESELECT')
        src.select_set(True)
        bpy.context.view_layer.objects.active = src

    # ── Final summary ─────────────────────────────────────────────────────────
    print(f"\n{'─'*52}")
    print("  SUMMARY")
    print(f"{'─'*52}")
    warnings = 0
    for name, vc in results:
        if vc == 0:
            tag = "  !! NO VERTICES"
            warnings += 1
        elif vc < 0:
            tag = "  !! SEPARATION FAILED"
            warnings += 1
        else:
            tag = ""
        print(f"  {name:<28}  {vc:>5} verts{tag}")

    remaining = len(src.data.vertices)
    print(f"\n  Remaining in source ({src.name!r}): {remaining} vertices")
    print(f"  Regions with issues: {warnings}")
    print(f"{'='*52}\n")


main()
