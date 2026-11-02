import { db, resetDb } from '../data/db';
import { put } from '../data/repo';
import type { Client } from '../data/schema';
import { logout } from './logout';
import { pb } from './pb';

beforeEach(async () => {
  await resetDb();
  pb.authStore.save('token-abc', null);
});

test('logout returns pending when outbox non-empty', async () => {
  await put<Client>('clients', { name: 'Unsynced' });
  expect(await logout()).toBe('pending');
  expect(pb.authStore.token).toBe('token-abc');
  expect(await db.coll('clients').count()).toBe(1);
});

test('logout force clears db and auth', async () => {
  await put<Client>('clients', { name: 'Unsynced' });
  expect(await logout({ force: true })).toBe('done');
  expect(pb.authStore.token).toBe('');
  expect(await db.coll('clients').count()).toBe(0);
  expect(await db.outbox.count()).toBe(0);
});

test('logout stops sync and waits for it before wiping, so a late pull writes nothing', async () => {
  const { startSync } = await import('../sync/engine');
  const { FakeTransport } = await import('../sync/fakeTransport');
  const t = new FakeTransport();
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
  const out = logout({ force: true });
  setTimeout(release, 20);
  expect(await out).toBe('done');
  await new Promise((r) => setTimeout(r, 100)); // let a late pull land, if sync wasn't stopped
  expect(await db.coll('clients').count()).toBe(0);
  expect(await db.meta.get('cursor:clients')).toBeUndefined();
});
