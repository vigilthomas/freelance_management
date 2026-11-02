import { liveQuery } from 'dexie';
import { db, type ForgeDB } from '../data/db';
import { SYNCED_COLLECTIONS, type CollectionName } from '../data/schema';
import { mergeDecision } from './merge';
import { setSyncState } from './status';
import { AuthExpiredError, type RemoteRecord, type Transport } from './transport';

const EPOCH = '1970-01-01 00:00:00.000Z';

let trigger: (() => void) | null = null;

/** Asks the running sync loop (if any) to run now, e.g. a Retry button or after re-login. */
export function requestSync(): void {
  trigger?.();
}

/** Merges one server record into the local store, respecting pending local edits. */
export async function applyRemote(c: CollectionName, remote: RemoteRecord, target: ForgeDB = db): Promise<void> {
  const table = target.coll(c);
  await target.transaction('rw', table, target.outbox, async () => {
    const local = await table.get(remote.id);
    const pending = (await target.outbox.where('[collection+id]').equals([c, remote.id]).count()) > 0;
    if (mergeDecision(local, remote, pending) === 'apply') await table.put(remote);
  });
}

async function push(t: Transport, target: ForgeDB): Promise<void> {
  for (;;) {
    const entry = await target.outbox.orderBy('seq').first();
    if (!entry) return;
    // 'ok' and 'stale' both retire the entry; for 'stale' the pull brings back the winning version.
    await t.upsert(entry);
    // A newer edit queued mid-request replaces this entry (new seq), so deleting by seq never drops it.
    await target.outbox.delete(entry.seq!);
  }
}

async function pull(t: Transport, target: ForgeDB): Promise<void> {
  for (const c of SYNCED_COLLECTIONS) {
    const key = `cursor:${c}`;
    const since = ((await target.meta.get(key))?.value as string | undefined) ?? EPOCH;
    let max = since;
    for (let page = 1, total = 1; page <= total; page++) {
      const res = await t.pull(c, since, page);
      total = res.totalPages;
      for (const r of res.items) {
        await applyRemote(c, r, target);
        if (r.updated > max) max = r.updated;
      }
    }
    if (max !== since) await target.meta.put({ key, value: max });
  }
}

/** One push-then-pull cycle. Never throws: failures are reported through the sync status. */
export async function syncOnce(t: Transport, target: ForgeDB = db): Promise<void> {
  setSyncState({ state: 'syncing' });
  try {
    await push(t, target);
    await pull(t, target);
    setSyncState({ state: 'synced', pending: await target.outbox.count(), lastSyncedAt: Date.now() }, true);
  } catch (err) {
    const pending = await target.outbox.count();
    if (err instanceof AuthExpiredError) {
      setSyncState({ state: 'error', pending, authExpired: true, error: 'Session expired — sign in again' }, true);
    } else if (err instanceof TypeError || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      setSyncState({ state: 'offline', pending }, true);
    } else {
      setSyncState({ state: 'error', pending, error: err instanceof Error ? err.message : String(err) }, true);
    }
  }
}

/** Starts background sync: now, every 30 s, on reconnect, and 1 s after local changes. Returns a stop function. */
export function startSync(t: Transport, target: ForgeDB = db): () => void {
  let running = false;
  let again = false;
  let stopped = false;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let unsubs: (() => void)[] = [];

  const ensureRealtime = async () => {
    if (unsubs.length || stopped) return;
    try {
      unsubs = await Promise.all(SYNCED_COLLECTIONS.map((c) => t.subscribe(c, (r) => void applyRemote(c, r, target))));
    } catch {
      unsubs.forEach((u) => u());
      unsubs = [];
    }
  };

  const run = async () => {
    if (stopped) return;
    if (running) {
      again = true;
      return;
    }
    running = true;
    const exec = async () => {
      do {
        again = false;
        await syncOnce(t, target);
      } while (again && !stopped);
    };
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    try {
      if (locks) await locks.request('forge-sync', exec);
      else await exec();
    } finally {
      running = false;
    }
    void ensureRealtime();
  };

  trigger = () => void run();
  const onOnline = () => void run();
  window.addEventListener('online', onOnline);
  const interval = setInterval(run, 30_000);
  const outboxSub = liveQuery(() => target.outbox.count()).subscribe((n) => {
    setSyncState({ pending: n });
    clearTimeout(debounce);
    if (n > 0) debounce = setTimeout(run, 1000);
  });
  void run();

  return () => {
    stopped = true;
    trigger = null;
    clearInterval(interval);
    clearTimeout(debounce);
    window.removeEventListener('online', onOnline);
    outboxSub.unsubscribe();
    unsubs.forEach((u) => u());
    unsubs = [];
  };
}

