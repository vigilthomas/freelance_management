import Dexie, { type Table } from 'dexie';
import { MASTER_KINDS, type BaseRecord, type CollectionName } from './schema';
import type { OutboxEntry } from './repo';

export interface MetaRow {
  key: string;
  value: unknown;
}

export class ForgeDB extends Dexie {
  outbox!: Table<OutboxEntry, number>;
  meta!: Table<MetaRow, string>;

  constructor(name = 'forge') {
    super(name);
    const stores: Record<string, string> = {
      outbox: '++seq, [collection+id]',
      meta: 'key',
      settings: 'id, updated_at',
      clients: 'id, updated_at, deleted, name',
      projects: 'id, updated_at, deleted, client, status',
    };
    for (const kind of MASTER_KINDS) stores[kind] = 'id, updated_at, deleted, sort_order';
    this.version(1).stores(stores);
  }

  coll<T extends BaseRecord = BaseRecord>(name: CollectionName): Table<T, string> {
    return this.table(name);
  }
}

export const db = new ForgeDB();

/** Wipes every local table (used on logout). */
export async function resetDb(target: ForgeDB = db): Promise<void> {
  await target.transaction('rw', target.tables, async () => {
    await Promise.all(target.tables.map((t) => t.clear()));
  });
}
