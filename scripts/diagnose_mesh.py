import bpy

# ─── Diagnostic: slice the mesh into Z bands and X halves ────────────────────
# Run this BEFORE split_muscles.py to understand where anatomy actually sits.
# Prints vertex counts per slice so you can map Z heights to body parts.

SLICE_HEIGHT = 0.05  # resolution of Z slices

def join_all_meshes():
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT')
    mesh_objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not mesh_objects:
        raise RuntimeError("No mesh objects found.")
    for o in mesh_objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objects[0]
    if len(mesh_objects) > 1:
        bpy.ops.object.join()
    return bpy.context.active_object

def main():
    obj = join_all_meshes()
    mat = obj.matrix_world
    verts = [mat @ v.co for v in obj.data.vertices]

    xs = [v.x for v in verts]
    ys = [v.y for v in verts]
    zs = [v.z for v in verts]

    z_min = min(zs)
    z_max = max(zs)

    print(f"\n{'='*64}")
    print(f"  Object: {obj.name!r}   total verts: {len(verts)}")
    print(f"  X: {min(xs):+.4f} → {max(xs):+.4f}")
    print(f"  Y: {min(ys):+.4f} → {max(ys):+.4f}   (negative = back, positive = front)")
    print(f"  Z: {z_min:+.4f} → {z_max:+.4f}")
    print(f"{'='*64}")
    print(f"  Z-slice breakdown (every {SLICE_HEIGHT}m)")
    print(f"  {'Z range':<22}  {'left (X<0)':>10}  {'right (X>0)':>11}  {'back (Y<0)':>10}  {'front (Y>0)':>11}")
    print(f"  {'─'*22}  {'─'*10}  {'─'*11}  {'─'*10}  {'─'*11}")

    z = z_min
    while z < z_max:
        z_lo = z
        z_hi = z + SLICE_HEIGHT
        band = [v for v in verts if z_lo <= v.z < z_hi]
        if band:
            left   = sum(1 for v in band if v.x < 0)
            right  = sum(1 for v in band if v.x >= 0)
            back   = sum(1 for v in band if v.y < 0)
            front  = sum(1 for v in band if v.y >= 0)
            print(f"  Z {z_lo:+.3f} → {z_hi:+.3f}   {left:>10}  {right:>11}  {back:>10}  {front:>11}")
        z += SLICE_HEIGHT

    # Also print Y distribution at key Z bands to distinguish front/back anatomy
    print(f"\n{'─'*64}")
    print("  Y-depth breakdown at key heights (negative=back, positive=front)")
    print(f"  {'Z range':<22}  {'Y < -0.05':>10}  {'-0.05–0.05':>11}  {'Y > 0.05':>10}")
    print(f"  {'─'*22}  {'─'*10}  {'─'*11}  {'─'*10}")
    key_bands = [
        (1.50, 1.75, "upper back / shoulder"),
        (1.20, 1.50, "mid upper back"),
        (0.85, 1.20, "mid back / lats"),
        (0.55, 0.85, "lower back / glutes top"),
        (0.25, 0.55, "glutes / upper leg"),
        (0.00, 0.25, "lower leg"),
    ]
    for z_lo, z_hi, label in key_bands:
        band = [v for v in verts if z_lo <= v.z < z_hi]
        if band:
            deep_back  = sum(1 for v in band if v.y < -0.05)
            mid        = sum(1 for v in band if -0.05 <= v.y <= 0.05)
            front_side = sum(1 for v in band if v.y > 0.05)
            print(f"  Z {z_lo:.2f}–{z_hi:.2f}  ({label:<26})  {deep_back:>9}  {mid:>11}  {front_side:>10}")

    print(f"{'='*64}\n")

main()
