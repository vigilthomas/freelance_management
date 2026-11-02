import { AnimatePresence, motion } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { useRows } from '../data/hooks';
import { put } from '../data/repo';
import type { MasterRecord } from '../data/schema';
import { cn } from './cn';
import { SWATCHES } from './misc';

/** Multi-select chips from the tags master, with inline "create tag". */
export function TagPicker({ value, onChange, label = 'Tags' }: { value: string[]; onChange(ids: string[]): void; label?: string }) {
  const tags = useRows<MasterRecord>('tags', { includeDeleted: true, sortBy: 'sort_order' }) ?? [];
  const [draft, setDraft] = useState('');
  const visible = tags.filter((t) => (t.active && !t.deleted) || value.includes(t.id));

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  async function create() {
    const name = draft.trim();
    if (!name) return;
    const existing = tags.find((t) => !t.deleted && t.name.toLowerCase() === name.toLowerCase());
    const tag =
      existing ??
      (await put<MasterRecord>('tags', {
        name,
        color: SWATCHES[tags.length % SWATCHES.length],
        sort_order: (tags.length + 1) * 10,
        active: true,
        is_default: false,
      }));
    if (!value.includes(tag.id)) onChange([...value, tag.id]);
    setDraft('');
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.8125rem] font-medium text-muted">{label}</span>
      <div className="flex flex-wrap gap-2">
        <AnimatePresence initial={false}>
          {visible.map((t) => {
            const on = value.includes(t.id);
            return (
              <motion.button
                key={t.id}
                type="button"
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                aria-pressed={on}
                onClick={() => toggle(t.id)}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] font-semibold transition-colors duration-fast',
                  on ? 'border-transparent text-ink' : 'border-line text-muted hover:text-ink',
                )}
                style={on ? { background: `color-mix(in srgb, ${t.color} 22%, transparent)` } : undefined}
              >
                {on ? <Check size={13} /> : <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />}
                {t.name}
              </motion.button>
            );
          })}
        </AnimatePresence>
        <span className="inline-flex h-8 items-center rounded-full border border-dashed border-line pl-3 pr-1">
          <input
            aria-label="New tag"
            placeholder="New tag"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void create();
              }
            }}
            className="w-20 bg-transparent text-[0.8125rem] outline-none placeholder:text-muted"
          />
          <button type="button" aria-label="Create tag" onClick={() => void create()} className="rounded-full p-1 text-muted hover:bg-surface-2 hover:text-ink">
            <Plus size={14} />
          </button>
        </span>
      </div>
    </div>
  );
}
