// In-memory Transport used by unit tests: mimics PocketBase upsert/LWW and the updated-cursor pull.
import type { BaseRecord, CollectionName } from '../data/schema';
import type { OutboxEntry } from '../data/repo';
import type { RemoteRecord, Transport } from './transport';

export class FakeTransport implements Transport {
  store = new Map<string, RemoteRecord>();
  pushed: OutboxEntry[] = [];
  fail: Error | null = null;
  private clock = 0;

  private stamp(): string {
    this.clock += 1;
    return `2026-01-01 00:00:${String(this.clock).padStart(6, '0')}Z`;
  }

  seed(c: CollectionName, r: BaseRecord & Record<string, unknown>) {
    this.store.set(`${c}/${r.id}`, { ...r, updated: this.stamp() });
  }

  async upsert(e: OutboxEntry): Promise<'ok' | 'stale'> {
    if (this.fail) throw this.fail;
    this.pushed.push(e);
    const key = `${e.collection}/${e.id}`;
    const current = this.store.get(key);
    if (current && e.payload.updated_at < current.updated_at) return 'stale';
    this.store.set(key, { ...e.payload, updated: this.stamp() });
    return 'ok';
  }

  async pull(c: CollectionName, since: string, page: number) {
    if (this.fail) throw this.fail;
    const items = [...this.store.entries()]
      .filter(([k, r]) => k.startsWith(`${c}/`) && r.updated >= since)
      .map(([, r]) => r)
      .sort((a, b) => a.updated.localeCompare(b.updated));
    const perPage = 2;
    return { items: items.slice((page - 1) * perPage, page * perPage), totalPages: Math.max(1, Math.ceil(items.length / perPage)) };
  }

  async subscribe() {
    return () => {};
  }
}
