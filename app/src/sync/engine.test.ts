import { db, resetDb } from '../data/db';
import { pendingCount, put } from '../data/repo';
import type { Client } from '../data/schema';
import { applyRemote, syncOnce } from './engine';
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
  expect(cursor).toBe('2026-01-01 00:00:000003Z');
  await syncOnce(t);
  expect(await db.coll('clients').count()).toBe(3);
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
