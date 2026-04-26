import bpy

# ─── Config ───────────────────────────────────────────────────────────────────

COLLECTION_NAME = 'Bonus collection'   # change if the collection is named differently
BATCH_SIZE = 200            # objects deleted per batch before Blender yields

# ─── Helpers ──────────────────────────────────────────────────────────────────

def find_collection(name):
    """Find a collection anywhere in the scene hierarchy (case-insensitive)."""
    name_lower = name.lower()
    for col in bpy.data.collections:
        if col.name.lower() == name_lower:
            return col
    return None


def collect_all_objects(collection):
    """Recursively gather every object in a collection and its children."""
    objects = set(collection.objects)
    for child_col in collection.children_recursive:
        objects.update(child_col.objects)
    return objects


def collect_all_collections(collection):
    """Gather the collection itself and every nested child collection."""
    cols = {collection}
    cols.update(collection.children_recursive)
    return cols


def delete_objects_in_batches(objects, batch_size):
    obj_list = list(objects)
    total    = len(obj_list)
    deleted  = 0

    print(f"  Deleting {total} objects in batches of {batch_size}…")

    while obj_list:
        batch = obj_list[:batch_size]
        obj_list = obj_list[batch_size:]

        for obj in batch:
            if obj.name in bpy.data.objects:
                bpy.data.objects.remove(obj, do_unlink=True)
                deleted += 1

        print(f"    {deleted}/{total} deleted…")

    print(f"  Done — {deleted} objects removed.")


def purge_orphan_data():
    """Remove meshes, materials, images etc. that no longer have users."""
    print("  Purging orphaned data blocks…")
    bpy.ops.outliner.orphans_purge(
        do_local_ids=True,
        do_linked_ids=True,
        do_recursive=True,
    )
    print("  Purge complete.")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print(f"\n{'='*52}")
    print(f"  Delete collection: {COLLECTION_NAME!r}")
    print(f"{'='*52}\n")

    col = find_collection(COLLECTION_NAME)
    if col is None:
        print(f"  ERROR: No collection named {COLLECTION_NAME!r} found.")
        print(f"  Available collections:")
        for c in bpy.data.collections:
            print(f"    - {c.name!r}")
        return

    print(f"  Found: {col.name!r}")

    all_objects     = collect_all_objects(col)
    all_collections = collect_all_collections(col)

    print(f"  Objects to delete:     {len(all_objects)}")
    print(f"  Collections to remove: {len(all_collections)}\n")

    # ── 1. Delete all objects in batches ──────────────────────────────────────
    bpy.ops.object.mode_set(mode='OBJECT')
    delete_objects_in_batches(all_objects, BATCH_SIZE)

    # ── 2. Unlink and remove all collections ──────────────────────────────────
    print(f"\n  Removing {len(all_collections)} collection(s)…")

    # Unlink top-level collection from scene first
    scene = bpy.context.scene
    if col.name in scene.collection.children:
        scene.collection.children.unlink(col)

    # Remove all nested collections bottom-up (children before parents)
    sorted_cols = sorted(all_collections, key=lambda c: -len(c.name))
    for c in sorted_cols:
        if c.name in bpy.data.collections:
            bpy.data.collections.remove(c)
            print(f"    Removed collection: {c.name!r}")

    # ── 3. Purge orphaned data ─────────────────────────────────────────────────
    purge_orphan_data()

    print(f"\n{'='*52}")
    print(f"  Finished. Scene objects remaining: {len(bpy.data.objects)}")
    print(f"{'='*52}\n")


main()
