import type { BaseRecord } from '../data/schema';

/** Record-level last-write-wins. A pending local edit only yields to a strictly newer remote. */
export function mergeDecision(local: BaseRecord | undefined, remote: BaseRecord, hasPending: boolean): 'apply' | 'skip' {
  if (!local) return 'apply';
  if (remote.updated_at > local.updated_at) return 'apply';
  if (remote.updated_at === local.updated_at && !hasPending) return 'apply';
  return 'skip';
}
