import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PresenceBoundary } from './PresenceBoundary';

interface DialogProps {
  open: boolean;
  onClose(): void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  /** Wider panel, announced as a regular dialog rather than an alert. */
  wide?: boolean;
}

export function Dialog({ open, onClose, title, children, actions, wide }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="dialog" className="fixed inset-0 z-[60] grid place-items-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role={wide ? 'dialog' : 'alertdialog'}
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className={`relative w-full ${wide ? 'max-w-xl' : 'max-w-md'} rounded-lg border border-line bg-surface p-6 shadow-3`}
          >
            <h2 className="mb-2 text-[1.25rem] font-bold">{title}</h2>
            <div className="text-[0.875rem] text-muted">
              <PresenceBoundary>{children}</PresenceBoundary>
            </div>
            {actions && (
              <div className="mt-6 flex justify-end gap-2">
                <PresenceBoundary>{actions}</PresenceBoundary>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
