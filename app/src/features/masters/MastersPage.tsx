import { Link, useParams } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useRows } from '../../data/hooks';
import { restore } from '../../data/repo';
import { MASTER_KINDS, type MasterKind, type MasterRecord } from '../../data/schema';
import { PageHeader } from '../../shell/PageHeader';
import { Button } from '../../ui/Button';
import { cn } from '../../ui/cn';
import { EmptyState } from '../../ui/misc';
import { useToast } from '../../ui/Toast';
import { removeMaster } from './actions';
import { MASTER_CONFIG, MASTER_TABS } from './config';
import { MasterForm } from './MasterForm';
import { MasterList } from './MasterList';

export function MastersPage() {
  const params = useParams({ strict: false }) as { kind?: string };
  const kind: MasterKind = MASTER_KINDS.includes(params.kind as MasterKind) ? (params.kind as MasterKind) : 'project_statuses';
  const cfg = MASTER_CONFIG[kind];
  const rows = useRows<MasterRecord>(kind, { sortBy: 'sort_order' });
  const [editing, setEditing] = useState<MasterRecord | undefined>();
  const [open, setOpen] = useState(false);
  const { show } = useToast();

  const openNew = () => {
    setEditing(undefined);
    setOpen(true);
  };

  async function remove(r: MasterRecord) {
    const result = await removeMaster(kind, r.id);
    if (result === 'in_use') {
      show(`“${r.name}” is in use — deactivate it instead`);
      return;
    }
    setOpen(false);
    show(`Deleted “${r.name}”`, { action: { label: 'Undo', onClick: () => void restore(kind, r.id) } });
  }

  const nextSortOrder = rows?.length ? Math.max(...rows.map((r) => r.sort_order)) + 10 : 0;

  return (
    <div>
      <PageHeader
        title="Masters"
        subtitle="The lists that power every dropdown in the app. Yours to shape."
        actions={<Button icon={<Plus size={18} />} onClick={openNew}>New {cfg.singular}</Button>}
      />

      <nav aria-label="Master lists" className="no-scrollbar -mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1 rounded-lg border border-line bg-surface p-1 shadow-1">
          {MASTER_TABS.map((k) => (
            <li key={k}>
              <Link
                to="/masters/$kind"
                params={{ kind: k }}
                className={cn(
                  'relative block whitespace-nowrap rounded-md px-3.5 py-2 text-[0.8125rem] font-semibold transition-colors duration-fast',
                  k === kind ? 'text-accent-ink' : 'text-muted hover:text-ink',
                )}
              >
                {k === kind && (
                  <motion.span layoutId="master-tab" className="absolute inset-0 rounded-md bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                )}
                <span className={cn('relative', k === kind && 'text-paper')}>{MASTER_CONFIG[k].title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="mb-4 text-[0.875rem] text-muted">{cfg.description} Drag to reorder.</p>

      {rows && rows.length === 0 ? (
        <EmptyState
          icon={<SlidersHorizontal size={24} />}
          title={`No ${cfg.title.toLowerCase()} yet`}
          body="Add your first value — it will appear in every related form."
          action={<Button icon={<Plus size={18} />} onClick={openNew}>Add {cfg.singular}</Button>}
        />
      ) : (
        rows && <MasterList kind={kind} rows={rows} onEdit={(r) => { setEditing(r); setOpen(true); }} />
      )}

      <MasterForm kind={kind} record={editing} open={open} onClose={() => setOpen(false)} nextSortOrder={nextSortOrder} onDelete={(r) => void remove(r)} />
    </div>
  );
}
