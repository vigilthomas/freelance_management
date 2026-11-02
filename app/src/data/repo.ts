import { newId } from '../lib/ids';
import { nowMs } from '../lib/dates';
import { db } from './db';
import type { BaseRecord, CollectionName } from './schema';

export interface OutboxEntry {
  seq?: number;
  collection: CollectionName;
  id: string;
  payload: BaseRecord;
  /** field → file to upload; null clears the file on the server */
  files?: Record<string, StoredFile | null>;
  /** Set when the server rejected this change for good; it is skipped until retried, edited again or discarded. */
  error?: string;
}

/** Files are queued as ArrayBuffers: Blobs in IndexedDB are unreliable on older Safari. */
export interface StoredFile {
  name: string;
  type: string;
  data: ArrayBuffer;
}

function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

async function toStored(files: Record<string, Blob | null> | undefined): Promise<Record<string, StoredFile | null>> {
  const out: Record<string, StoredFile | null> = {};
  for (const [field, blob] of Object.entries(files ?? {})) {
    out[field] = blob
      ? { name: (blob as File).name || field, type: blob.type, data: await readBlob(blob) }
      : null;
  }
  return out;
}

/**
 * Creates or merges a record locally and queues it for sync, in one transaction.
 * Older queued entries for the same record are replaced (the payload is always the full record).
 */
export async function put<T extends BaseRecord>(
  c: CollectionName,
  data: Partial<T>,
  files?: Record<string, Blob | null>,
): Promise<T> {
  const table = db.coll<T>(c);
  const stored = await toStored(files);
  return db.transaction('rw', table, db.outbox, async () => {
    const existing = data.id ? await table.get(data.id) : undefined;
    const record = {
      ...existing,
      ...data,
      id: data.id ?? newId(),
      updated_at: Math.max(nowMs(), (existing?.updated_at ?? 0) + 1),
      deleted: data.deleted ?? existing?.deleted ?? false,
    } as T;
    await table.put(record);

    const older = await db.outbox.where('[collection+id]').equals([c, record.id]).toArray();
    const carried = older.reduce<Record<string, StoredFile | null>>((acc, e) => ({ ...acc, ...e.files }), {});
    await db.outbox.bulkDelete(older.map((e) => e.seq!));
    const merged = { ...carried, ...stored };
    await db.outbox.add({
      collection: c,
      id: record.id,
      payload: record,
      ...(Object.keys(merged).length ? { files: merged } : {}),
    });
    return record;
  });
}

export async function get<T extends BaseRecord>(c: CollectionName, id: string): Promise<T | undefined> {
  return db.coll<T>(c).get(id);
}

export async function softDelete(c: CollectionName, id: string): Promise<void> {
  await put(c, { id, deleted: true });
}

export async function restore(c: CollectionName, id: string): Promise<void> {
  await put(c, { id, deleted: false });
}

export async function pendingCount(): Promise<number> {
  return db.outbox.count();
}
