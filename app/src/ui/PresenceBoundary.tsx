import { PresenceContext } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Detaches content from an enclosing AnimatePresence. Without it, a shared-layout element inside a closing
 * Sheet/Dialog (e.g. a SegmentedControl pill that has moved) never reports its exit as done, so the overlay
 * stays mounted and invisibly blocks the page. The panel's own exit animation still runs.
 */
export function PresenceBoundary({ children }: { children: ReactNode }) {
  return <PresenceContext.Provider value={null}>{children}</PresenceContext.Provider>;
}
