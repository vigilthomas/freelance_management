// In-memory Transport used by unit tests: mimics PocketBase upsert/LWW and the keyset pull.
import type { BaseRecord, CollectionName } from '../data/schema';
import type { OutboxEntry } from '../data/repo';
import { AuthExpiredError, RejectedError, type Cursor, type RemoteRecord, type Transport } from './transport';

export class FakeTransport implements Transport {
  store = new Map<string, RemoteRecord>();
  pushed: OutboxEntry[] = [];
  fail: Error | null = null;
  authExpired = false;
  /** id → server validation message */
  reject = new Map<string, string>();
  perPage = 2;
  pulledItems = 0;
  /** Runs after each pull page is computed, before it is returned (simulate concurrent writes / slow network). */
  onPull: ((c: CollectionName) => Promise<void> | void) | null = null;
  subscribeFail: Error | null = null;
  unsubscribeAllCalls = 0;
  private clock = 0;

  private stamp(): string {
    this.clock += 1;
    return `2026-01-01 00:00:${String(this.clock).padStart(6, '0')}Z`;
  }

  seed(c: CollectionName, r: BaseRecord & Record<string, unknown>) {
    this.store.set(`${c}/${r.id}`, { ...r, updated: this.stamp() });
  }

  async checkAuth() {
    if (this.fail) throw this.fail;
    if (this.authExpired) throw new AuthExpiredError();
  }

  async upsert(e: OutboxEntry): Promise<'ok' | 'stale'> {
    if (this.fail) throw this.fail;
    if (this.reject.has(e.id)) throw new RejectedError(this.reject.get(e.id)!);
    this.pushed.push(e);
    const key = `${e.collection}/${e.id}`;
    const current = this.store.get(key);
    if (current && e.payload.updated_at < current.updated_at) return 'stale';
    this.store.set(key, { ...e.payload, updated: this.stamp() });
    return 'ok';
  }

  async pull(c: CollectionName, after: Cursor) {
    if (this.fail) throw this.fail;
    const items = [...this.store.entries()]
      .filter(([k, r]) => k.startsWith(`${c}/`) && (r.updated > after.updated || (r.updated === after.updated && r.id > after.id)))
      .map(([, r]) => r)
      .sort((a, b) => a.updated.localeCompare(b.updated) || a.id.localeCompare(b.id))
      .slice(0, this.perPage);
    await this.onPull?.(c);
    this.pulledItems += items.length;
    return { items, more: items.length === this.perPage };
  }

  async subscribe() {
    if (this.subscribeFail) throw this.subscribeFail;
    return () => {};
  }

  async unsubscribeAll() {
    this.unsubscribeAllCalls += 1;
  }
}
