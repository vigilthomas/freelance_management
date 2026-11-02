import { db } from '../../data/db';
import { put, softDelete } from '../../data/repo';
import type { MasterKind, MasterRecord } from '../../data/schema';
import { MASTER_REFERENCES } from './references';

export async function isMasterInUse(kind: MasterKind, id: string): Promise<boolean> {
  for (const ref of MASTER_REFERENCES[kind]) {
    const rows = await db.coll(ref.collection).toArray();
    const hit = rows.some((r) => {
      if (r.deleted) return false;
      const v = (r as unknown as Record<string, unknown>)[ref.field];
      return ref.array ? Array.isArray(v) && v.includes(id) : v === id;
    });
    if (hit) return true;
  }
  return false;
}

export async function setDefault(kind: MasterKind, id: string): Promise<void> {
  const rows = await db.coll<MasterRecord>(kind).toArray();
  for (const r of rows) {
    const want = r.id === id;
    if (r.is_default !== want) await put<MasterRecord>(kind, { id: r.id, is_default: want });
  }
}

export async function reorder(kind: MasterKind, orderedIds: string[]): Promise<void> {
  const t = db.coll<MasterRecord>(kind);
  for (const [i, id] of orderedIds.entries()) {
    if ((await t.get(id))?.sort_order !== i * 10) await put<MasterRecord>(kind, { id, sort_order: i * 10 });
  }
}

/** Soft-deletes a master value only when nothing references it. */
export async function removeMaster(kind: MasterKind, id: string): Promise<'deleted' | 'in_use'> {
  if (await isMasterInUse(kind, id)) return 'in_use';
  await softDelete(kind, id);
  return 'deleted';
}
