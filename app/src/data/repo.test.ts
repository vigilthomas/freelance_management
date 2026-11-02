import { db, resetDb } from './db';
import { get, pendingCount, put, restore, softDelete } from './repo';
import type { Client, Settings } from './schema';

beforeEach(async () => {
  await resetDb();
});

test('put assigns id, updated_at and outbox entry', async () => {
  const c = await put<Client>('clients', { name: 'Acme' });
  expect(c.id).toMatch(/^[a-z0-9]{15}$/);
  expect(c.updated_at).toBeGreaterThan(0);
  expect(c.deleted).toBe(false);
  const outbox = await db.outbox.toArray();
  expect(outbox).toHaveLength(1);
  expect(outbox[0]).toMatchObject({ collection: 'clients', id: c.id, payload: { name: 'Acme' } });
});

test('second put of same record coalesces to one outbox entry with latest payload', async () => {
  const c = await put<Client>('clients', { name: 'Acme' });
  await put<Client>('clients', { id: c.id, name: 'Acme Ltd' });
  const outbox = await db.outbox.toArray();
  expect(outbox).toHaveLength(1);
  expect(outbox[0].payload).toMatchObject({ name: 'Acme Ltd' });
});

test('coalescing carries forward un-pushed files', async () => {
  const blob = new Blob(['x'], { type: 'image/png' });
  await put('settings', { id: 'settings0000000' }, { logo: blob });
  await put<Settings>('settings', { id: 'settings0000000', business_name: 'Me' });
  const [entry] = await db.outbox.toArray();
  expect(entry.files?.logo).toMatchObject({ type: 'image/png' });
  expect(entry.files?.logo?.data.byteLength).toBe(1);
});

test('softDelete sets deleted and enqueues', async () => {
  const c = await put<Client>('clients', { name: 'Acme' });
  await db.outbox.clear();
  await softDelete('clients', c.id);
  expect((await get<Client>('clients', c.id))?.deleted).toBe(true);
  expect(await pendingCount()).toBe(1);
  await restore('clients', c.id);
  expect((await get<Client>('clients', c.id))?.deleted).toBe(false);
});

test('outbox survives db reopen', async () => {
  await put<Client>('clients', { name: 'Acme' });
  db.close();
  await db.open();
  expect(await pendingCount()).toBe(1);
});

test('put merges partial update with existing fields', async () => {
  const c = await put<Client>('clients', { name: 'Acme', email: 'a@acme.test' });
  const updated = await put<Client>('clients', { id: c.id, phone: '123' });
  expect(updated).toMatchObject({ name: 'Acme', email: 'a@acme.test', phone: '123' });
  expect(updated.updated_at).toBeGreaterThanOrEqual(c.updated_at);
});
