import { motion } from 'framer-motion';
import { cn } from './cn';
import { spring } from './motion';

export function SegmentedControl<T extends string>({ value, onChange, options, id }: { value: T; onChange(v: T): void; options: { value: T; label: string }[]; id: string }) {
  return (
    <div role="tablist" className="inline-flex rounded-md border border-line bg-surface p-1 shadow-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('relative rounded-[10px] px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors duration-fast', value === o.value ? 'text-paper' : 'text-muted hover:text-ink')}
        >
          {value === o.value && <motion.span layoutId={`seg-${id}`} transition={spring} className="absolute inset-0 rounded-[10px] bg-ink" />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
