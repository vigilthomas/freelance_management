import { useSyncExternalStore } from 'react';

export interface SyncState {
  state: 'synced' | 'syncing' | 'offline' | 'error';
  pending: number;
  lastSyncedAt?: number;
  error?: string;
  authExpired?: boolean;
}

let current: SyncState = { state: 'synced', pending: 0 };
const listeners = new Set<() => void>();

export function getSyncState(): SyncState {
  return current;
}

/** Merges into the current state; with replace, drops transient fields (error, authExpired) not given. */
export function setSyncState(next: Partial<SyncState>, replace = false): void {
  current = replace
    ? ({ pending: current.pending, lastSyncedAt: current.lastSyncedAt, ...next } as SyncState)
    : { ...current, ...next };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useSyncStatus(): SyncState {
  return useSyncExternalStore(subscribe, getSyncState, getSyncState);
}
