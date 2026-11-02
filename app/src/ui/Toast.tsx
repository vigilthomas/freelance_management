import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastOpts {
  action?: { label: string; onClick(): void };
  ms?: number;
}

interface ToastItem extends ToastOpts {
  id: number;
  msg: string;
}

const ToastContext = createContext<{ show(msg: string, opts?: ToastOpts): void }>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);

  const show = useCallback(
    (msg: string, opts: ToastOpts = {}) => {
      const id = ++seq.current;
      setItems((xs) => [...xs.slice(-2), { id, msg, ...opts }]);
      setTimeout(() => dismiss(id), opts.ms ?? 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="pointer-events-auto flex items-center gap-4 rounded-md bg-ink py-2.5 pl-4 pr-2 text-[0.875rem] text-paper shadow-3"
            >
              <span>{t.msg}</span>
              {t.action && (
                <button
                  className="rounded-sm px-2.5 py-1 font-semibold text-accent hover:bg-white/10"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
