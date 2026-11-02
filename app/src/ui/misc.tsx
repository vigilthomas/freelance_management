import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from './cn';

export function Badge({ color, children, className }: { color?: string; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[0.75rem] font-semibold', className)}
      style={{ background: color ? `color-mix(in srgb, ${color} 14%, transparent)` : 'var(--surface-2)', color: 'var(--ink)' }}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />}
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center rounded-lg border border-dashed border-line px-6 py-14 text-center"
    >
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-lg bg-accent-soft text-accent">{icon}</div>
      <h3 className="text-[1.25rem] font-bold">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-[0.875rem] text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function Card({ children, className, interactive }: { children: ReactNode; className?: string; interactive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface p-5 shadow-1',
        interactive && 'transition-[transform,box-shadow] duration-fast ease-brand hover:-translate-y-0.5 hover:shadow-2',
        className,
      )}
    >
      {children}
    </div>
  );
}

export const SWATCHES = ['#FF5A36', '#F97316', '#EAB308', '#22C55E', '#14B8A6', '#3B82F6', '#7C5CFF', '#A855F7', '#EC4899', '#8B90A0'];

export function ColorSwatch({ value, onChange, label = 'Color' }: { value: string; onChange(c: string): void; label?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.8125rem] font-medium text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={label}>
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value.toLowerCase() === c.toLowerCase()}
            aria-label={c}
            onClick={() => onChange(c)}
            className="relative h-8 w-8 rounded-full transition-transform duration-fast hover:scale-110"
            style={{ background: c }}
          >
            {value.toLowerCase() === c.toLowerCase() && (
              <motion.span layoutId={`swatch-${label}`} className="absolute -inset-1 rounded-full border-2 border-ink" />
            )}
          </button>
        ))}
        <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border border-line bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0" aria-label="Custom color" />
        </label>
      </div>
    </div>
  );
}
