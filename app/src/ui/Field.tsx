import { useId, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from './cn';

export const controlClass = (error?: string) =>
  cn(
    'w-full rounded-md border bg-surface-2 px-3.5 text-[0.875rem] text-ink placeholder:text-muted',
    'transition-[border-color,box-shadow,background-color] duration-fast ease-brand',
    'focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
    'disabled:opacity-50',
    error ? 'border-danger' : 'border-transparent hover:border-line',
  );

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

/** Label + control + animated error/hint. Children receive the id to wire up. */
export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-[0.8125rem] font-medium text-muted">
          {label}
        </label>
      )}
      {children(id, error || hint ? msgId : undefined)}
      <AnimatePresence initial={false}>
        {(error || hint) && (
          <motion.p
            key={error ? 'e' : 'h'}
            id={msgId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className={cn('text-[0.75rem]', error ? 'text-danger' : 'text-muted')}
            role={error ? 'alert' : undefined}
          >
            {error || hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
