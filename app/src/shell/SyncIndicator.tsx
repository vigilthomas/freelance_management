import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { requestSync } from '../sync/engine';
import { useSyncStatus, type SyncState } from '../sync/status';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';

const DOT: Record<SyncState['state'], string> = {
  synced: 'bg-success',
  syncing: 'bg-accent animate-pulse',
  offline: 'bg-warning',
  error: 'bg-danger',
};

function label(s: SyncState): string {
  if (s.state === 'offline') return s.pending ? `Offline · ${s.pending} pending` : 'Offline';
  if (s.state === 'error') return s.authExpired ? 'Sign in needed' : 'Sync error';
  if (s.state === 'syncing') return 'Syncing…';
  return s.pending ? `${s.pending} pending` : 'Synced';
}

function ago(ms?: number): string {
  if (!ms) return 'never';
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function SyncIndicator({ onSignInAgain, compact }: { onSignInAgain(): void; compact?: boolean }) {
  const s = useSyncStatus();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        aria-label="Sync status"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[0.75rem] font-semibold text-ink transition-colors duration-fast hover:bg-surface-2"
      >
        <span className={cn('h-2 w-2 rounded-full', DOT[s.state])} aria-hidden />
        <span className={cn(compact && 'sr-only sm:not-sr-only')}>{label(s)}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="absolute right-0 top-full z-40 mt-2 w-64 origin-top-right rounded-lg border border-line bg-surface p-4 shadow-2 lg:left-0 lg:right-auto lg:bottom-full lg:top-auto lg:mb-2 lg:origin-bottom-left"
          >
            <p className="text-[0.875rem] font-semibold">{label(s)}</p>
            <dl className="mt-2 space-y-1 text-[0.8125rem] text-muted">
              <div className="flex justify-between">
                <dt>Pending changes</dt>
                <dd className="tabular text-ink">{s.pending}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Last synced</dt>
                <dd className="text-ink">{ago(s.lastSyncedAt)}</dd>
              </div>
            </dl>
            {s.error && !s.authExpired && <p className="mt-2 text-[0.75rem] text-danger">{s.error}</p>}
            <div className="mt-4 flex gap-2">
              {s.authExpired ? (
                <Button size="sm" className="flex-1" onClick={() => { setOpen(false); onSignInAgain(); }}>
                  Sign in again
                </Button>
              ) : (
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => requestSync()}>
                  Retry now
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
