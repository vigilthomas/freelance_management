import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { fromMinor, toMinor } from '../../lib/money';
import { Button } from '../../ui/Button';
import { controlClass } from '../../ui/Field';
import { cn } from '../../ui/cn';

/** Editable rows of {name, percent}. Percent is typed as text and stored as basis points by the parent. */
export interface ComponentDraft {
  key: string;
  name: string;
  percent: string;
}

export function componentsToDrafts(components: { name: string; rate: number }[] = []): ComponentDraft[] {
  return components.map((c, i) => ({ key: `${i}-${c.name}`, name: c.name, percent: fromMinor(c.rate, 2).replace(/\.?0+$/, '') }));
}

/** Returns null when any row is invalid (empty name, non-numeric or out-of-range percent). */
export function draftsToComponents(drafts: ComponentDraft[]): { name: string; rate: number }[] | null {
  const out: { name: string; rate: number }[] = [];
  for (const d of drafts) {
    const rate = toMinor(d.percent, 2);
    if (!d.name.trim() || rate === null || rate < 0 || rate > 10000) return null;
    out.push({ name: d.name.trim(), rate });
  }
  return out;
}

export function TaxComponentsEditor({ value, onChange, error }: { value: ComponentDraft[]; onChange(v: ComponentDraft[]): void; error?: string }) {
  const total = draftsToComponents(value)?.reduce((s, c) => s + c.rate, 0);
  const update = (key: string, patch: Partial<ComponentDraft>) => onChange(value.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[0.8125rem] font-medium text-muted">Components</span>
        <span className="tabular text-[0.8125rem] font-semibold">Total {total === undefined ? '—' : `${fromMinor(total, 2).replace(/\.?0+$/, '')}%`}</span>
      </div>
      <AnimatePresence initial={false}>
        {value.map((d) => (
          <motion.div
            key={d.key}
            layout
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex items-center gap-2"
          >
            <input
              aria-label="Component name"
              placeholder="CGST"
              value={d.name}
              onChange={(e) => update(d.key, { name: e.target.value })}
              className={cn(controlClass(), 'h-11 flex-1')}
            />
            <div className="relative w-28">
              <input
                aria-label="Component percent"
                inputMode="decimal"
                placeholder="9"
                value={d.percent}
                onChange={(e) => update(d.key, { percent: e.target.value })}
                className={cn(controlClass(), 'tabular h-11 pr-8 text-right')}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">%</span>
            </div>
            <button
              type="button"
              aria-label="Remove component"
              onClick={() => onChange(value.filter((x) => x.key !== d.key))}
              className="rounded-md p-2.5 text-muted hover:bg-surface-2 hover:text-danger"
            >
              <Trash2 size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      {error && <p className="text-[0.75rem] text-danger" role="alert">{error}</p>}
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        icon={<Plus size={16} />}
        onClick={() => onChange([...value, { key: crypto.randomUUID(), name: '', percent: '' }])}
      >
        Add component
      </Button>
    </div>
  );
}
