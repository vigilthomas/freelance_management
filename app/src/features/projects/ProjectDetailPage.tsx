import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarDays, CheckSquare, Pencil, ReceiptText, Timer, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useRow, useRows } from '../../data/hooks';
import { put, restore, softDelete } from '../../data/repo';
import type { Client, MasterRecord, Project } from '../../data/schema';
import { Button } from '../../ui/Button';
import { Badge, Card, EmptyState } from '../../ui/misc';
import { itemVariants, listVariants } from '../../ui/motion';
import { useToast } from '../../ui/Toast';
import { MasterSelect, useMasterMap } from '../masters/MasterSelect';
import { ProjectForm } from './ProjectForm';
import { billingSummary, formatDue } from './ProjectsPage';

function daysLeft(due: string): string {
  if (!due) return '';
  const ms = new Date(`${due}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime();
  const days = Math.round(ms / 86_400_000);
  if (days === 0) return 'Due today';
  return days > 0 ? `${days} day${days === 1 ? '' : 's'} left` : `${-days} day${days === -1 ? '' : 's'} overdue`;
}

function Upcoming({ icon, title, phase }: { icon: ReactNode; title: string; phase: number }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-line px-4 py-3.5 text-[0.875rem]">
      <span className="text-accent">{icon}</span>
      <span className="flex-1 font-semibold">{title}</span>
      <span className="text-[0.75rem] text-muted">Phase {phase}</span>
    </div>
  );
}

export function ProjectDetailPage() {
  const { id } = useParams({ from: '/projects/$id' });
  const navigate = useNavigate();
  const project = useRow<Project>('projects', id);
  const client = useRow<Client>('clients', project?.client);
  const statuses = useMasterMap('project_statuses');
  const currencies = useMasterMap('currencies');
  const tags = useRows<MasterRecord>('tags', { includeDeleted: true }) ?? [];
  const [editing, setEditing] = useState(false);
  const { show } = useToast();

  if (project === undefined) return null;
  if (!project || project.deleted) {
    return (
      <EmptyState
        icon={<ArrowLeft size={24} />}
        title="Project not found"
        body="It may have been deleted on another device."
        action={<Link to="/projects"><Button variant="secondary">Back to projects</Button></Link>}
      />
    );
  }

  const status = statuses.get(project.status);
  const due = formatDue(project.due_date);
  const budgetH = project.budget_minutes / 60;
  const projectTags = tags.filter((t) => project.tags?.includes(t.id));

  async function remove() {
    await softDelete('projects', id);
    void navigate({ to: '/projects' });
    show(`Deleted ${project!.name}`, { action: { label: 'Undo', onClick: () => void restore('projects', id) } });
  }

  return (
    <div>
      <Link to="/projects" className="mb-6 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> Projects
      </Link>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="h-3 w-3 rounded-full"
              style={{ background: project.color || status?.color }}
            />
            {client && (
              <Link to="/clients/$id" params={{ id: client.id }} className="text-[0.875rem] font-semibold text-muted hover:text-accent">
                {client.name}
              </Link>
            )}
          </div>
          <h1 className="truncate text-[2rem] font-extrabold sm:text-[2.75rem]">{project.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Pencil size={16} />} onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => void remove()} aria-label="Delete project" />
        </div>
      </header>

      <motion.div variants={listVariants} initial="initial" animate="animate" className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <motion.section variants={itemVariants} className="order-2 flex flex-col gap-3 lg:order-1">
          <h2 className="text-[1.25rem] font-bold">Work</h2>
          <Upcoming icon={<CheckSquare size={18} />} title="Tasks" phase={2} />
          <Upcoming icon={<Timer size={18} />} title="Time entries" phase={3} />
          <Upcoming icon={<ReceiptText size={18} />} title="Expenses & invoices" phase={4} />
          {project.notes && (
            <Card className="mt-2">
              <h3 className="mb-2 text-[1rem] font-bold">Notes</h3>
              <p className="whitespace-pre-line text-[0.875rem] text-muted">{project.notes}</p>
            </Card>
          )}
        </motion.section>

        <motion.aside variants={itemVariants} className="order-1 flex flex-col gap-5 lg:order-2">
          <Card>
            <MasterSelect kind="project_statuses" label="Status" value={project.status} onChange={(v) => void put<Project>('projects', { id, status: v })} />
            <dl className="mt-5 grid grid-cols-2 gap-y-3 text-[0.875rem]">
              <dt className="text-muted">Billing</dt>
              <dd className="tabular text-right font-semibold">{billingSummary(project, currencies)}</dd>
              <dt className="text-muted">Currency</dt>
              <dd className="text-right font-semibold">{currencies.get(project.currency)?.code ?? '—'}</dd>
              <dt className="text-muted">Start</dt>
              <dd className="text-right font-semibold">{project.start_date ? formatDue(project.start_date).label : '—'}</dd>
              <dt className="text-muted">Due</dt>
              <dd className={`text-right font-semibold ${due.overdue && status?.meaning !== 'closed' ? 'text-danger' : ''}`}>
                {due.label ? (
                  <span className="inline-flex items-center gap-1"><CalendarDays size={14} />{due.label}</span>
                ) : '—'}
              </dd>
            </dl>
            {project.due_date && status?.meaning !== 'closed' && <p className="mt-3 text-right text-[0.75rem] text-muted">{daysLeft(project.due_date)}</p>}
          </Card>
          {budgetH > 0 && (
            <Card>
              <div className="mb-2 flex justify-between text-[0.875rem]">
                <span className="font-bold">Budget</span>
                <span className="tabular text-muted">0 / {+budgetH.toFixed(2)} h</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full w-0 rounded-full bg-accent" />
              </div>
              <p className="mt-2 text-[0.75rem] text-muted">Logged time arrives with the timer in Phase 3.</p>
            </Card>
          )}
          {projectTags.length > 0 && (
            <Card>
              <h3 className="mb-3 text-[1rem] font-bold">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {projectTags.map((t) => <Badge key={t.id} color={t.color}>{t.name}</Badge>)}
              </div>
            </Card>
          )}
        </motion.aside>
      </motion.div>

      <ProjectForm open={editing} onClose={() => setEditing(false)} project={project} />
    </div>
  );
}
