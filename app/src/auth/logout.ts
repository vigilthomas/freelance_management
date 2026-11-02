import { resetDb } from '../data/db';
import { pendingCount } from '../data/repo';
import { stopActiveSync } from '../sync/engine';
import { pb } from './pb';

/** Signs out and wipes local data. Refuses with 'pending' while unsynced changes exist, unless forced. */
export async function logout(opts: { force?: boolean } = {}): Promise<'done' | 'pending'> {
  if (!opts.force && (await pendingCount()) > 0) return 'pending';
  // Stop first: a pull still in flight must not write into (or set a cursor for) the wiped database.
  await stopActiveSync();
  pb.authStore.clear();
  await resetDb();
  return 'done';
}
