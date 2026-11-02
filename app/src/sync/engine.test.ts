import { db, resetDb } from '../data/db';
import { pendingCount, put } from '../data/repo';
import type { Client } from '../data/schema';
import { applyRemote, discardFailed, retryFailed, startSync, stopActiveSync, syncOnce } from './engine';
import { FakeTransport } from './fakeTransport';
import { getSyncState } from './status';
import { AuthExpiredError } from './transport';

let t: FakeTransport;
beforeEach(async () => {
  await resetDb();
  t = new FakeTransport();
});

test('pushes outbox in order then clears it', async () => {
  const a = await put<Client>('clients', { name: 'A' });
  const b = await put<Client>('clients', { name: 'B' });
  await syncOnce(t);
  expect(t.pushed.map((e) => e.id)).toEqual([a.id, b.id]);
  expect(await pendingCount()).toBe(0);
  expect(getSyncState()).toMatchObject({ state: 'synced', pending: 0 });
});

test('stale response drops entry and pull restores server version', async () => {
  const c = await put<Client>('clients', { name: 'Local old' });
  t.seed('clients', { ...c, name: 'Server newer', updated_at: c.updated_at + 1000 });
  await syncOnce(t);
  expect(await pendingCount()).toBe(0);
  expect((await db.coll<Client>('clients').get(c.id))?.name).toBe('Server newer');
});

test('pull advances cursor and is idempotent on re-run', async () => {
  for (const n of ['x', 'y', 'z']) t.seed('clients', { id: `id${n}`.padEnd(15, '0'), name: n, updated_at: 1, deleted: false });
  await syncOnce(t);
  expect(await db.coll('clients').count()).toBe(3);
  const cursor = (await db.meta.get('cursor:clients'))?.value;
  expect(cursor).toEqual({ updated: '2026-01-01 00:00:000003Z', id: 'idz' + '0'.repeat(12) });
  t.pulledItems = 0;
  await syncOnce(t);
  expect(await db.coll('clients').count()).toBe(3);
  expect(t.pulledItems).toBe(0); // nothing re-pulled, so nothing re-rendered
});

test('401 keeps outbox', async () => {
  await put<Client>('clients', { name: 'A' });
  t.fail = new AuthExpiredError();
  await syncOnce(t);
  expect(await pendingCount()).toBe(1);
  expect(getSyncState()).toMatchObject({ state: 'error', authExpired: true, pending: 1 });
});

test('offline (fetch TypeError) sets state offline and keeps outbox', async () => {
  await put<Client>('clients', { name: 'A' });
  t.fail = new TypeError('Failed to fetch');
  await syncOnce(t);
  expect(await pendingCount()).toBe(1);
  expect(getSyncState()).toMatchObject({ state: 'offline', pending: 1 });
});

test('pending local edit is not overwritten by older realtime event', async () => {
  const c = await put<Client>('clients', { name: 'Mine' });
  await applyRemote('clients', { ...c, name: 'Old server', updated_at: c.updated_at - 10, updated: '2026-01-01 00:00:000001Z' });
  expect((await db.coll<Client>('clients').get(c.id))?.name).toBe('Mine');
});

test('a server-rejected change is set aside and later changes still sync', async () => {
  const bad = await put<Client>('clients', { name: 'Too big' });
  const good = await put<Client>('clients', { name: 'Fine' });
  t.reject.set(bad.id, 'File is too large');
  await syncOnce(t);
  expect(t.pushed.map((e) => e.id)).toEqual([good.id]);
  expect(getSyncState()).toMatchObject({ state: 'error', pending: 0, failed: 1 });
  const left = await db.outbox.toArray();
  expect(left).toHaveLength(1);
  expect(left[0]).toMatchObject({ id: bad.id, error: 'File is too large' });

  await syncOnce(t); // the set-aside entry is not retried on its own
  expect(t.pushed).toHaveLength(1);

  t.reject.clear();
  await retryFailed();
  await syncOnce(t);
  expect(await db.outbox.count()).toBe(0);
  expect(getSyncState()).toMatchObject({ state: 'synced', failed: 0 });
});

test('discarding a failed change removes it and restores the server copy', async () => {
  const c = await put<Client>('clients', { name: 'Server' });
  await syncOnce(t);
  await put<Client>('clients', { id: c.id, name: 'Rejected edit' });
  t.reject.set(c.id, 'bad');
  await syncOnce(t);
  const [entry] = await db.outbox.toArray();
  await discardFailed(entry.seq!);
  await db.meta.delete('cursor:clients');
  await syncOnce(t);
  expect(await db.outbox.count()).toBe(0);
  expect((await db.coll<Client>('clients').get(c.id))?.name).toBe('Server');
});

test('an invalid session is reported as "sign in again" even with nothing to push', async () => {
  t.authExpired = true;
  await syncOnce(t);
  expect(getSyncState()).toMatchObject({ state: 'error', authExpired: true });
});

test('a record edited on another device mid-pull is not skipped', async () => {
  for (const n of ['a', 'b', 'c', 'd', 'e']) t.seed('clients', { id: n.repeat(15), name: n, updated_at: 1, deleted: false });
  let first = true;
  t.onPull = () => {
    if (!first) return;
    first = false;
    t.seed('clients', { id: 'a'.repeat(15), name: 'a2', updated_at: 2, deleted: false }); // moves 'a' to the end
  };
  await syncOnce(t);
  expect(await db.coll('clients').count()).toBe(5);
  expect((await db.coll<Client>('clients').get('a'.repeat(15)))?.name).toBe('a2');
});

test('stopping sync clears every realtime subscription, even ones that failed to connect', async () => {
  t.subscribeFail = new Error('offline');
  const stop = startSync(t);
  await new Promise((r) => setTimeout(r, 50));
  expect(t.unsubscribeAllCalls).toBeGreaterThan(0); // failed subscribe cleaned up
  const before = t.unsubscribeAllCalls;
  await stop();
  expect(t.unsubscribeAllCalls).toBe(before + 1);
});

test('a pull still in flight when sync stops writes nothing (logout race)', async () => {
  t.seed('clients', { id: 'x'.repeat(15), name: 'late', updated_at: 1, deleted: false });
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let started!: () => void;
  const pulling = new Promise<void>((r) => (started = r));
  t.onPull = async () => {
    started();
    await gate;
  };
  startSync(t);
  await pulling;
  const stopped = stopActiveSync();
  await resetDb();
  release();
  await stopped;
  expect(await db.coll('clients').count()).toBe(0);
  expect(await db.meta.get('cursor:clients')).toBeUndefined();
});
