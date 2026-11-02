import type PocketBase from 'pocketbase';
import { FILE_FIELDS, type BaseRecord, type CollectionName } from '../data/schema';
import type { OutboxEntry } from '../data/repo';

export type RemoteRecord = BaseRecord & { updated: string } & Record<string, unknown>;

export class AuthExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'AuthExpiredError';
  }
}

export interface Transport {
  upsert(e: OutboxEntry): Promise<'ok' | 'stale'>;
  pull(c: CollectionName, since: string, page: number): Promise<{ items: RemoteRecord[]; totalPages: number }>;
  subscribe(c: CollectionName, cb: (r: RemoteRecord) => void): Promise<() => void>;
}

const SERVER_FIELDS = ['created', 'updated', 'collectionId', 'collectionName', 'expand'];

function statusOf(err: unknown): number | undefined {
  return typeof err === 'object' && err !== null && 'status' in err ? (err as { status: number }).status : undefined;
}

function rethrow(err: unknown): never {
  const status = statusOf(err);
  if (status === 401 || status === 403) throw new AuthExpiredError();
  if (status === 0) throw new TypeError('Network request failed');
  throw err;
}

/** Builds the request body: strips server-managed fields and file names, attaches queued files. */
function toBody(e: OutboxEntry): Record<string, unknown> {
  const body: Record<string, unknown> = { ...e.payload };
  for (const f of SERVER_FIELDS) delete body[f];
  for (const f of FILE_FIELDS[e.collection] ?? []) delete body[f];
  for (const [field, file] of Object.entries(e.files ?? {})) {
    body[field] = file ? new File([file.data], file.name, { type: file.type }) : null;
  }
  return body;
}

export function createPbTransport(pb: PocketBase): Transport {
  return {
    async upsert(e) {
      const body = toBody(e);
      try {
        await pb.collection(e.collection).update(e.id, body);
        return 'ok';
      } catch (err) {
        const status = statusOf(err);
        if (status === 409) return 'stale';
        if (status !== 404) rethrow(err);
      }
      try {
        await pb.collection(e.collection).create({ ...body, id: e.id });
        return 'ok';
      } catch (err) {
        rethrow(err);
      }
    },
    async pull(c, since, page) {
      try {
        const res = await pb.collection(c).getList<RemoteRecord>(page, 200, {
          filter: pb.filter('updated >= {:since}', { since }),
          sort: 'updated',
        });
        return { items: res.items, totalPages: res.totalPages };
      } catch (err) {
        rethrow(err);
      }
    },
    async subscribe(c, cb) {
      return pb.collection(c).subscribe<RemoteRecord>('*', (ev) => cb(ev.record));
    },
  };
}
