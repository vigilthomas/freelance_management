import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PresenceBoundary } from './PresenceBoundary';
import { useMediaQuery } from './useMediaQuery';

interface SheetProps {
  open: boolean;
  onClose(): void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Right drawer on desktop, bottom sheet on mobile. */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const desktop = useMediaQuery('(min-width: 768px)');
  const panel = useRef<HTMLDivElement>(null);
  // Parents pass a fresh inline onClose on every render; keep it in a ref so re-renders never re-run the focus effect.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => {
      const el = panel.current;
      (el?.querySelector<HTMLElement>('input,select,textarea') ?? el?.querySelector<HTMLElement>('button'))?.focus();
    }, 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open]);

  const offscreen = desktop ? { x: '100%' } : { y: '100%' };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="sheet" className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={offscreen}
            animate={{ x: 0, y: 0 }}
            exit={offscreen}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            className={
              desktop
                ? 'absolute right-0 top-0 flex h-full w-[440px] max-w-full flex-col border-l border-line bg-surface shadow-3'
                : 'absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-xl border-t border-line bg-surface shadow-3'
            }
          >
            {!desktop && <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line" aria-hidden />}
            <header className="flex items-center justify-between px-6 pb-2 pt-5">
              <h2 className="text-[1.5rem] font-bold">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink">
                <X size={18} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <PresenceBoundary>{children}</PresenceBoundary>
            </div>
            {footer && (
              <footer className="flex justify-end gap-2 border-t border-line px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <PresenceBoundary>{footer}</PresenceBoundary>
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
