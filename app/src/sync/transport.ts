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

/** The server refused this change for good (validation, size, type): retrying it unchanged cannot succeed. */
export class RejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RejectedError';
  }
}

/** Rate limit or server restart: try again later. */
export class TransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransientError';
  }
}

/** Keyset position: everything strictly after (updated, id). */
export interface Cursor {
  updated: string;
  id: string;
}

export interface Transport {
  /** Throws AuthExpiredError when the session is no longer valid (PocketBase treats a bad token as a guest, not a 401). */
  checkAuth(force?: boolean): Promise<void>;
  upsert(e: OutboxEntry): Promise<'ok' | 'stale'>;
  pull(c: CollectionName, after: Cursor): Promise<{ items: RemoteRecord[]; more: boolean }>;
  subscribe(c: CollectionName, cb: (r: RemoteRecord) => void): Promise<() => void>;
  /** Drops every realtime listener, including ones whose connect failed. */
  unsubscribeAll(): Promise<void>;
}

const PAGE = 200;
const AUTH_RECHECK_MS = 10 * 60_000;

const SERVER_FIELDS = ['created', 'updated', 'collectionId', 'collectionName', 'expand'];

function statusOf(err: unknown): number | undefined {
  return typeof err === 'object' && err !== null && 'status' in err ? (err as { status: number }).status : undefined;
}

/** "logo: The file is too large." from a PocketBase validation response, else its message. */
function describe(err: unknown): string {
  const data = (err as { response?: { data?: Record<string, { message?: string }> } }).response?.data ?? {};
  const fields = Object.entries(data).map(([f, v]) => `${f}: ${v?.message ?? 'invalid'}`);
  return fields.length ? fields.join('; ') : err instanceof Error ? err.message : String(err);
}

function rethrow(err: unknown): never {
  const status = statusOf(err);
  if (status === undefined) throw err;
  if (status === 401 || status === 403) throw new AuthExpiredError();
  if (status === 0) throw new TypeError('Network request failed');
  if (status === 429 || status >= 500) throw new TransientError(describe(err));
  throw new RejectedError(describe(err));
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
  let badToken = '';
  let checkedAt = 0;

  async function checkAuth(force = false) {
    const token = pb.authStore.token;
    // Sticky: a token found bad stays bad until a new sign-in replaces it.
    if (!token || token === badToken) throw new AuthExpiredError();
    if (!pb.authStore.isValid) {
      badToken = token;
      throw new AuthExpiredError();
    }
    if (!force && Date.now() - checkedAt < AUTH_RECHECK_MS) return;
    try {
      await pb.collection('users').authRefresh({ requestKey: null });
      checkedAt = Date.now();
    } catch (err) {
      const status = statusOf(err);
      if (status === 401 || status === 403 || status === 404) {
        badToken = token;
        throw new AuthExpiredError();
      }
      rethrow(err);
    }
  }

  return {
    checkAuth,
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
        // A guest (revoked or tampered token) gets 404 on update and 400 on create: rule out auth before blaming the data.
        const status = statusOf(err);
        if (status === 400 || status === 404) await checkAuth(true);
        rethrow(err);
      }
    },
    async pull(c, after) {
      try {
        const res = await pb.collection(c).getList<RemoteRecord>(1, PAGE, {
          filter: pb.filter('updated > {:u} || (updated = {:u} && id > {:id})', { u: after.updated, id: after.id }),
          sort: 'updated,id',
          skipTotal: true,
        });
        return { items: res.items, more: res.items.length === PAGE };
      } catch (err) {
        rethrow(err);
      }
    },
    async subscribe(c, cb) {
      return pb.collection(c).subscribe<RemoteRecord>('*', (ev) => cb(ev.record));
    },
    async unsubscribeAll() {
      await pb.realtime.unsubscribe().catch(() => {});
    },
  };
}
