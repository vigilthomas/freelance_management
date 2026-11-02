import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { BaseRecord, CollectionName } from './schema';

export function useRows<T extends BaseRecord>(
  c: CollectionName,
  opts: { includeDeleted?: boolean; sortBy?: keyof T } = {},
): T[] | undefined {
  const { includeDeleted = false, sortBy } = opts;
  return useLiveQuery(async () => {
    let rows = await db.coll<T>(c).toArray();
    if (!includeDeleted) rows = rows.filter((r) => !r.deleted);
    if (sortBy) {
      rows.sort((a, b) => {
        const x = a[sortBy] as unknown as string | number;
        const y = b[sortBy] as unknown as string | number;
        return typeof x === 'string' ? x.localeCompare(String(y)) : Number(x) - Number(y);
      });
    }
    return rows;
  }, [c, includeDeleted, sortBy]);
}

export function useRow<T extends BaseRecord>(c: CollectionName, id: string | undefined): T | undefined {
  return useLiveQuery(() => (id ? db.coll<T>(c).get(id) : undefined), [c, id]);
}

export function usePendingCount(): number {
  return useLiveQuery(() => db.outbox.count(), []) ?? 0;
}
