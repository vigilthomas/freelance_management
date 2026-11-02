import { Link } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, Plus, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRows } from '../../data/hooks';
import type { Client, Project } from '../../data/schema';
import { PageHeader } from '../../shell/PageHeader';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { cn } from '../../ui/cn';
import { controlClass } from '../../ui/Field';
import { Badge, EmptyState } from '../../ui/misc';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { useMasterMap } from '../masters/MasterSelect';
import { ClientForm } from './ClientForm';

type View = 'active' | 'archived';

export function ClientsPage() {
  const clients = useRows<Client>('clients', { sortBy: 'name' });
  const projects = useRows<Project>('projects');
  const currencies = useMasterMap('currencies');
  const [q, setQ] = useState('');
  const [view, setView] = useState<View>('active');
  const [open, setOpen] = useState(false);

  const projectCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of projects ?? []) m.set(p.client, (m.get(p.client) ?? 0) + 1);
    return m;
  }, [projects]);

  const term = q.trim().toLowerCase();
  const shown = (clients ?? []).filter(
    (c) => (view === 'archived') === !!c.archived && (!term || [c.name, c.email, c.contact_name].some((v) => v?.toLowerCase().includes(term))),
  );

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={clients ? `${clients.filter((c) => !c.archived).length} active` : undefined}
        actions={<Button icon={<Plus size={18} />} onClick={() => setOpen(true)}>New client</Button>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            aria-label="Search clients"
            placeholder="Search by name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={cn(controlClass(), 'h-11 pl-10')}
          />
        </div>
        <SegmentedControl<View> id="clients" value={view} onChange={setView} options={[{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]} />
      </div>

      {clients && shown.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title={term ? 'No matches' : view === 'archived' ? 'Nothing archived' : 'No clients yet'}
          body={term ? 'Try a different name or email.' : view === 'active' ? 'Add the people and companies you work for.' : undefined}
          action={!term && view === 'active' ? <Button icon={<Plus size={18} />} onClick={() => setOpen(true)}>Add your first client</Button> : undefined}
        />
      ) : (
        <motion.ul layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((c, i) => (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 12) * 0.035, duration: 0.24 } }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.16 } }}
              >
                <Link
                  to="/clients/$id"
                  params={{ id: c.id }}
                  className="group flex h-full flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-1 transition-[transform,box-shadow] duration-fast ease-brand hover:-translate-y-0.5 hover:shadow-2"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} />
                    <div className="min-w-0">
                      <p className="truncate text-[1rem] font-bold">{c.name}</p>
                      <p className="truncate text-[0.8125rem] text-muted">{c.contact_name || c.email || 'No contact yet'}</p>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between text-[0.8125rem]">
                    <span className="flex items-center gap-1.5 text-muted">
                      {c.email && <Mail size={14} />}
                      {projectCount.get(c.id) ?? 0} project{projectCount.get(c.id) === 1 ? '' : 's'}
                    </span>
                    {currencies.get(c.currency) && <Badge>{currencies.get(c.currency)!.code}</Badge>}
                  </div>
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      <ClientForm open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
