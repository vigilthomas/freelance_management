// Two simulated devices syncing against a real PocketBase. Runs only when PB_URL is set:
//   PB_URL=http://127.0.0.1:8090 npm test -- --run src/sync/engine.int
import PocketBase from 'pocketbase';
import { ForgeDB, resetDb } from '../data/db';
import type { Client } from '../data/schema';
import { newId } from '../lib/ids';
import { syncOnce } from './engine';
import { createPbTransport } from './transport';

const PB_URL = process.env.PB_URL;
const EMAIL = process.env.DEV_EMAIL ?? 'dev@forge.test';
const PASSWORD = process.env.DEV_PASSWORD ?? 'devpassword123';

async function device(name: string) {
  const target = new ForgeDB(name);
  await target.open();
  await resetDb(target);
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  await pb.collection('users').authWithPassword(EMAIL, PASSWORD);
  return { target, t: createPbTransport(pb), pb };
}

/** Local edit on a specific device: what repo.put does, against a non-default database. */
async function edit(target: ForgeDB, rec: Client) {
  await target.coll<Client>('clients').put(rec);
  await target.outbox.add({ collection: 'clients', id: rec.id, payload: rec });
}

describe.skipIf(!PB_URL)('sync against PocketBase', () => {
  test('two devices converge with last-write-wins and soft deletes', async () => {
    const A = await device('devA');
    const B = await device('devB');
    const id = newId();
    const base = {
      id, name: 'Int Co', contact_name: '', email: '', phone: '', address: '', state_region: '', tax_id: '',
      currency: '', default_hourly_rate: 0, payment_term: '', notes: '', archived: false, deleted: false,
    };
    const t0 = Date.now();

    await edit(A.target, { ...base, updated_at: t0 });
    await syncOnce(A.t, A.target);
    await syncOnce(B.t, B.target);
    expect((await B.target.coll<Client>('clients').get(id))?.name).toBe('Int Co');

    await edit(B.target, { ...base, name: 'B rename', updated_at: t0 + 2000 });
    await edit(A.target, { ...base, name: 'A offline older', updated_at: t0 + 1000 });
    await syncOnce(B.t, B.target);
    await syncOnce(A.t, A.target);
    await syncOnce(B.t, B.target);
    expect((await A.target.coll<Client>('clients').get(id))?.name).toBe('B rename');
    expect((await B.target.coll<Client>('clients').get(id))?.name).toBe('B rename');

    await edit(A.target, { ...base, name: 'B rename', deleted: true, updated_at: t0 + 3000 });
    await syncOnce(A.t, A.target);
    await syncOnce(B.t, B.target);
    expect((await B.target.coll<Client>('clients').get(id))?.deleted).toBe(true);

    await A.pb.collection('clients').delete(id);
  }, 20_000);
});
