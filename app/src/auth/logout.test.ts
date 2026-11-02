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
