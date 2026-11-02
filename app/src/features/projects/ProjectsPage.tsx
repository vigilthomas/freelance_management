import { Link } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, FolderKanban, Plus } from 'lucide-react';
import { useState } from 'react';
import { useRows } from '../../data/hooks';
import type { Client, MasterRecord, Project } from '../../data/schema';
import { formatMoney } from '../../lib/money';
import { todayISO } from '../../lib/dates';
import { PageHeader } from '../../shell/PageHeader';
import { Button } from '../../ui/Button';
import { cn } from '../../ui/cn';
import { Badge, EmptyState } from '../../ui/misc';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { Select } from '../../ui/Select';
import { useMasterMap } from '../masters/MasterSelect';
import { ProjectForm } from './ProjectForm';

type Layout = 'grid' | 'status';
const OPEN = '__open';

export function formatDue(due: string): { label: string; overdue: boolean } {
  if (!due) return { label: '', overdue: false };
  const d = new Date(`${due}T00:00:00`);
  return { label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), overdue: due < todayISO() };
}

export function billingSummary(p: Project, currencies: Map<string, MasterRecord>): string {
  const cur = currencies.get(p.currency);
  const fmt = (m: number) => (cur ? formatMoney(m, { code: cur.code!, decimals: cur.decimals ?? 2 }) : String(m));
  if (p.billing_type === 'fixed') return `Fixed · ${fmt(p.fixed_price)}`;
  return p.hourly_rate ? `${fmt(p.hourly_rate)}/h` : 'Hourly · client rate';
}

function ProjectCard({ p, client, status, currencies, i }: { p: Project; client?: Client; status?: MasterRecord; currencies: Map<string, MasterRecord>; i: number }) {
  const due = formatDue(p.due_date);
  const closed = status?.meaning === 'closed';
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 12) * 0.035, duration: 0.24 } }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.16 } }}
    >
      <Link
        to="/projects/$id"
        params={{ id: p.id }}
        className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-lg border border-line bg-surface p-5 pl-6 shadow-1 transition-[transform,box-shadow] duration-fast ease-brand hover:-translate-y-0.5 hover:shadow-2"
      >
        <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: p.color || status?.color || 'var(--line)' }} aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[1rem] font-bold">{p.name}</p>
            <p className="truncate text-[0.8125rem] text-muted">{client?.name ?? 'Unknown client'}</p>
          </div>
          {status && <Badge color={status.color}>{status.name}</Badge>}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 text-[0.8125rem]">
          <span className="tabular truncate text-muted">{billingSummary(p, currencies)}</span>
          {due.label && (
            <span className={cn('flex shrink-0 items-center gap-1 font-semibold', due.overdue && !closed ? 'text-danger' : 'text-muted')}>
              <CalendarDays size={14} />
              {due.label}
            </span>
          )}
        </div>
      </Link>
    </motion.li>
  );
}

export function ProjectsPage() {
  const projects = useRows<Project>('projects', { sortBy: 'name' });
  const clients = useRows<Client>('clients') ?? [];
  const statuses = useRows<MasterRecord>('project_statuses', { includeDeleted: true, sortBy: 'sort_order' }) ?? [];
  const tags = useRows<MasterRecord>('tags', { sortBy: 'sort_order' }) ?? [];
  const currencies = useMasterMap('currencies');
  const [statusFilter, setStatusFilter] = useState(OPEN);
  const [clientFilter, setClientFilter] = useState('');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [layout, setLayout] = useState<Layout>('grid');
  const [open, setOpen] = useState(false);

  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const statusMap = new Map(statuses.map((s) => [s.id, s]));

  const shown = (projects ?? []).filter((p) => {
    const st = statusMap.get(p.status);
    if (statusFilter === OPEN ? st?.meaning === 'closed' : statusFilter && p.status !== statusFilter) return false;
    if (clientFilter && p.client !== clientFilter) return false;
    return tagFilter.every((t) => p.tags?.includes(t));
  });

  const groups =
    layout === 'status'
      ? statuses.filter((s) => !s.deleted).map((s) => ({ status: s, items: shown.filter((p) => p.status === s.id) })).filter((g) => g.items.length)
      : [{ status: undefined, items: shown }];

  const filtersActive = statusFilter !== OPEN || clientFilter || tagFilter.length;

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={projects ? `${shown.length} of ${projects.length} shown` : undefined}
        actions={<Button icon={<Plus size={18} />} onClick={() => setOpen(true)}>New project</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Select
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ value: OPEN, label: 'All open' }, ...statuses.filter((s) => !s.deleted).map((s) => ({ value: s.id, label: s.name }))]}
          placeholder="All statuses"
        />
        <Select
          label="Client"
          value={clientFilter}
          onChange={setClientFilter}
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="All clients"
        />
        <SegmentedControl<Layout> id="project-layout" value={layout} onChange={setLayout} options={[{ value: 'grid', label: 'All' }, { value: 'status', label: 'By status' }]} />
      </div>
      {tags.length > 0 && (
        <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Filter by tag">
          {tags.map((t) => {
            const on = tagFilter.includes(t.id);
            return (
              <button
                key={t.id}
                aria-pressed={on}
                onClick={() => setTagFilter(on ? tagFilter.filter((x) => x !== t.id) : [...tagFilter, t.id])}
                className={cn('h-8 shrink-0 rounded-full border px-3 text-[0.8125rem] font-semibold transition-colors duration-fast', on ? 'border-transparent text-ink' : 'border-line text-muted hover:text-ink')}
                style={on ? { background: `color-mix(in srgb, ${t.color} 22%, transparent)` } : undefined}
              >
                #{t.name}
              </button>
            );
          })}
        </div>
      )}

      {projects && shown.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={24} />}
          title={projects.length ? 'No projects match' : 'No projects yet'}
          body={projects.length ? 'Try clearing a filter.' : clients.length ? 'Start your first project for a client.' : 'Add a client first, then create projects for them.'}
          action={
            filtersActive && projects.length ? (
              <Button variant="secondary" onClick={() => { setStatusFilter(OPEN); setClientFilter(''); setTagFilter([]); }}>Clear filters</Button>
            ) : clients.length ? (
              <Button icon={<Plus size={18} />} onClick={() => setOpen(true)}>New project</Button>
            ) : (
              <Link to="/clients"><Button>Go to clients</Button></Link>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((g) => (
            <section key={g.status?.id ?? 'all'}>
              {g.status && (
                <h2 className="mb-3 flex items-center gap-2 text-[1rem] font-bold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.status.color }} />
                  {g.status.name}
                  <span className="tabular text-muted">{g.items.length}</span>
                </h2>
              )}
              <motion.ul layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence initial={false} mode="popLayout">
                  {g.items.map((p, i) => (
                    <ProjectCard key={p.id} p={p} i={i} client={clientMap.get(p.client)} status={statusMap.get(p.status)} currencies={currencies} />
                  ))}
                </AnimatePresence>
              </motion.ul>
            </section>
          ))}
        </div>
      )}

      <ProjectForm open={open} onClose={() => setOpen(false)} defaultClientId={clientFilter || undefined} />
    </div>
  );
}
