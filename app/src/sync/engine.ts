import { liveQuery } from 'dexie';
import { db, type ForgeDB } from '../data/db';
import { SYNCED_COLLECTIONS, type CollectionName } from '../data/schema';
import { mergeDecision } from './merge';
import { setSyncState } from './status';
import { AuthExpiredError, RejectedError, type Cursor, type RemoteRecord, type Transport } from './transport';

const EPOCH = '1970-01-01 00:00:00.000Z';

/** Lets a cycle notice that sync was stopped (logout) so a late response writes nothing. */
interface Guard {
  stopped: boolean;
}

let trigger: (() => void) | null = null;
let active: { stop(): Promise<void> } | null = null;

/** Asks the running sync loop (if any) to run now, e.g. a Retry button or after re-login. */
export function requestSync(): void {
  trigger?.();
}

/** Stops background sync and waits for a cycle in flight to finish (call before wiping local data). */
export function stopActiveSync(): Promise<void> {
  return active?.stop() ?? Promise.resolve();
}

/** Merges one server record into the local store, respecting pending local edits. */
export async function applyRemote(c: CollectionName, remote: RemoteRecord, target: ForgeDB = db): Promise<void> {
  const table = target.coll(c);
  await target.transaction('rw', table, target.outbox, async () => {
    const local = (await table.get(remote.id)) as RemoteRecord | undefined;
    // Same server version already stored: skip the write so live queries don't re-render for nothing.
    if (local && local.updated === remote.updated && local.updated_at === remote.updated_at) return;
    const pending = (await target.outbox.where('[collection+id]').equals([c, remote.id]).count()) > 0;
    if (mergeDecision(local, remote, pending) === 'apply') await table.put(remote);
  });
}

async function counts(target: ForgeDB): Promise<{ pending: number; failed: number }> {
  const all = await target.outbox.toArray();
  const failed = all.filter((e) => e.error).length;
  return { pending: all.length - failed, failed };
}

/** Re-queues every change the server rejected (e.g. after fixing the cause on the server). */
export async function retryFailed(target: ForgeDB = db): Promise<void> {
  await target.outbox.toCollection().modify((e) => {
    delete e.error;
  });
  requestSync();
}

/** Drops a rejected change and brings back the server's copy of that record. */
export async function discardFailed(seq: number, target: ForgeDB = db): Promise<void> {
  await target.transaction('rw', [target.outbox, target.meta, ...SYNCED_COLLECTIONS.map((c) => target.coll(c))], async () => {
    const entry = await target.outbox.get(seq);
    if (!entry) return;
    await target.outbox.delete(seq);
    await target.coll(entry.collection).delete(entry.id);
    await target.meta.delete(`cursor:${entry.collection}`);
  });
  requestSync();
}

async function push(t: Transport, target: ForgeDB, guard: Guard): Promise<void> {
  for (;;) {
    if (guard.stopped) return;
    const entry = await target.outbox
      .orderBy('seq')
      .filter((e) => !e.error)
      .first();
    if (!entry) return;
    try {
      // 'ok' and 'stale' both retire the entry; for 'stale' a fresh pull brings back the winning version.
      if ((await t.upsert(entry)) === 'stale') await target.meta.delete(`cursor:${entry.collection}`);
      // A newer edit queued mid-request replaces this entry (new seq), so deleting by seq never drops it.
      await target.outbox.delete(entry.seq!);
    } catch (err) {
      if (!(err instanceof RejectedError)) throw err;
      // Set it aside so one bad change can't block everything queued after it.
      await target.outbox.update(entry.seq!, { error: err.message });
    }
  }
}

async function pull(t: Transport, target: ForgeDB, guard: Guard): Promise<void> {
  for (const c of SYNCED_COLLECTIONS) {
    const key = `cursor:${c}`;
    const raw = (await target.meta.get(key))?.value as Cursor | string | undefined;
    // Older builds stored a bare timestamp; an empty id makes it inclusive, as before.
    let cursor: Cursor = typeof raw === 'string' ? { updated: raw, id: '' } : (raw ?? { updated: EPOCH, id: '' });
    for (;;) {
      const res = await t.pull(c, cursor);
      if (guard.stopped) return;
      for (const r of res.items) await applyRemote(c, r, target);
      const last = res.items[res.items.length - 1];
      if (last) {
        cursor = { updated: last.updated, id: last.id };
        await target.meta.put({ key, value: cursor });
      }
      if (!res.more) break;
    }
  }
}

/** One push-then-pull cycle. Never throws: failures are reported through the sync status. */
export async function syncOnce(t: Transport, target: ForgeDB = db, guard: Guard = { stopped: false }): Promise<void> {
  setSyncState({ state: 'syncing' });
  try {
    await t.checkAuth();
    await push(t, target, guard);
    await pull(t, target, guard);
    if (guard.stopped) return;
    const { pending, failed } = await counts(target);
    if (failed) {
      const error = `${failed} change${failed > 1 ? 's' : ''} couldn't be saved on the server`;
      setSyncState({ state: 'error', pending, failed, error, lastSyncedAt: Date.now() }, true);
    } else {
      setSyncState({ state: 'synced', pending, failed, lastSyncedAt: Date.now() }, true);
    }
  } catch (err) {
    if (guard.stopped) return;
    const { pending, failed } = await counts(target);
    if (err instanceof AuthExpiredError) {
      setSyncState({ state: 'error', pending, failed, authExpired: true, error: 'Session expired — sign in again' }, true);
    } else if (err instanceof TypeError || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      setSyncState({ state: 'offline', pending, failed }, true);
    } else {
      setSyncState({ state: 'error', pending, failed, error: err instanceof Error ? err.message : String(err) }, true);
    }
  }
}

/** Starts background sync: now, every 30 s, on reconnect, and 1 s after local changes. Returns a stop function. */
export function startSync(t: Transport, target: ForgeDB = db): () => Promise<void> {
  const guard: Guard = { stopped: false };
  let running: Promise<void> | null = null;
  let again = false;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let subscribed = false;

  const ensureRealtime = async () => {
    if (subscribed || guard.stopped || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    subscribed = true;
    try {
      await Promise.all(SYNCED_COLLECTIONS.map((c) => t.subscribe(c, (r) => void (!guard.stopped && applyRemote(c, r, target)))));
      if (guard.stopped) await t.unsubscribeAll();
    } catch {
      // A failed connect can still leave listeners registered: clear them all before trying again later.
      subscribed = false;
      await t.unsubscribeAll();
    }
  };

  const run = () => {
    if (guard.stopped) return;
    if (running) {
      again = true;
      return;
    }
    const exec = async () => {
      do {
        again = false;
        await syncOnce(t, target, guard);
      } while (again && !guard.stopped);
    };
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    running = (async () => {
      try {
        if (locks) await locks.request('forge-sync', exec);
        else await exec();
      } finally {
        running = null;
      }
      await ensureRealtime();
    })();
  };

  trigger = run;
  window.addEventListener('online', run);
  const interval = setInterval(run, 30_000);
  const outboxSub = liveQuery(() => counts(target)).subscribe(({ pending, failed }) => {
    setSyncState({ pending, failed });
    clearTimeout(debounce);
    if (pending > 0) debounce = setTimeout(run, 1000);
  });
  run();

  const stop = async () => {
    if (guard.stopped) return;
    guard.stopped = true;
    if (trigger === run) trigger = null;
    if (active?.stop === stop) active = null;
    clearInterval(interval);
    clearTimeout(debounce);
    window.removeEventListener('online', run);
    outboxSub.unsubscribe();
    await running?.catch(() => {});
    await t.unsubscribeAll();
  };
  active = { stop };
  return stop;
}
