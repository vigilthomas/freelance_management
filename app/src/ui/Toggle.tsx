import { motion } from 'framer-motion';
import { cn } from './cn';

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange(v: boolean): void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1">
      <span>
        <span className="block text-[0.875rem] font-medium">{label}</span>
        {hint && <span className="block text-[0.75rem] text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-fast',
          checked ? 'justify-end bg-accent' : 'justify-start bg-line',
        )}
      >
        <motion.span layout transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="h-5 w-5 rounded-full bg-white shadow-1" />
      </button>
    </label>
  );
}
