import bpy

BATCH_SIZE = 200

def main():
    # Collect all objects that are hidden in the viewport
    hidden = [obj for obj in bpy.data.objects if obj.hide_viewport or obj.hide_get()]

    total = len(hidden)
    print(f"\n{'='*52}")
    print(f"  Hidden objects found: {total}")
    print(f"{'='*52}\n")

    if total == 0:
        print("  Nothing to delete.")
        return

    deleted = 0
    for i in range(0, total, BATCH_SIZE):
        batch = hidden[i:i + BATCH_SIZE]
        for obj in batch:
            bpy.data.objects.remove(obj, do_unlink=True)
            deleted += 1
        print(f"    {deleted}/{total} deleted…")

    print(f"\n  Done — {deleted} objects removed.")

    # Purge leftover meshes, materials, etc.
    bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
    print(f"  Orphans purged.")
    print(f"  Objects remaining in scene: {len(bpy.data.objects)}")
    print(f"{'='*52}\n")

main()
