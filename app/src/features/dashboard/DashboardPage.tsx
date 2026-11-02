import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { ArrowUpRight, CalendarClock, FolderKanban, ReceiptText, Timer, Users } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import { useRow } from '../../data/hooks';
import { SETTINGS_ID, type MasterRecord, type Project, type Settings } from '../../data/schema';
import { itemVariants, listVariants } from '../../ui/motion';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function DashboardPage() {
  const settings = useRow<Settings>('settings', SETTINGS_ID);
  const stats = useLiveQuery(async () => {
    const clients = (await db.coll('clients').toArray()).filter((c) => !c.deleted && !(c as unknown as { archived: boolean }).archived);
    const statuses = await db.coll<MasterRecord>('project_statuses').toArray();
    const open = new Set(statuses.filter((s) => s.meaning === 'open').map((s) => s.id));
    const projects = (await db.coll<Project>('projects').toArray()).filter((p) => !p.deleted);
    return { clients: clients.length, active: projects.filter((p) => open.has(p.status)).length, projects: projects.length };
  }, []);

  const tiles = [
    { label: 'Active clients', value: stats?.clients ?? 0, icon: Users, to: '/clients' },
    { label: 'Open projects', value: stats?.active ?? 0, icon: FolderKanban, to: '/projects' },
  ];

  const upcoming = [
    { icon: CalendarClock, title: 'Tasks & calendar', body: 'Deadlines, kanban board and filtered exports.' },
    { icon: Timer, title: 'Time tracking', body: 'One-tap timer that keeps running across devices.' },
    { icon: ReceiptText, title: 'Invoices & payments', body: 'Taxed PDF invoices, partial payments, balances.' },
  ];

  return (
    <div className="flex flex-col gap-8">
      <section className="hero-mesh rounded-xl border border-line p-7 sm:p-10">
        <p className="text-[0.875rem] font-medium" style={{ color: 'color-mix(in srgb, var(--ink) 70%, transparent)' }}>
          {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="mt-2 text-[2.25rem] font-extrabold sm:text-[3.5rem]">
          {greeting()}
          {settings?.business_name ? `, ${settings.business_name}` : ''}.
        </h1>
      </section>

      <motion.section variants={listVariants} initial="initial" animate="animate" className="grid gap-4 sm:grid-cols-2">
        {tiles.map(({ label, value, icon: Icon, to }) => (
          <motion.div key={label} variants={itemVariants}>
            <Link
              to={to}
              className="group flex items-center justify-between rounded-lg border border-line bg-surface p-6 shadow-1 transition-[transform,box-shadow] duration-fast ease-brand hover:-translate-y-0.5 hover:shadow-2"
            >
              <div>
                <p className="text-[0.8125rem] font-medium text-muted">{label}</p>
                <p className="tabular mt-1 font-display text-[2.75rem] font-extrabold leading-none">{value}</p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-accent-soft text-accent transition-transform duration-fast group-hover:rotate-[-8deg]">
                <Icon size={22} />
              </span>
            </Link>
          </motion.div>
        ))}
      </motion.section>

      <section>
        <h2 className="mb-4 text-[1.25rem] font-bold">Coming next</h2>
        <motion.div variants={listVariants} initial="initial" animate="animate" className="grid gap-4 md:grid-cols-3">
          {upcoming.map(({ icon: Icon, title, body }) => (
            <motion.div key={title} variants={itemVariants} className="rounded-lg border border-dashed border-line p-5">
              <div className="flex items-center justify-between">
                <Icon size={20} className="text-accent" />
                <ArrowUpRight size={16} className="text-muted" />
              </div>
              <h3 className="mt-4 text-[1rem] font-bold">{title}</h3>
              <p className="mt-1 text-[0.8125rem] text-muted">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
