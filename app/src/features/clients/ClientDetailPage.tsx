import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Archive, ArchiveRestore, ArrowLeft, FolderKanban, Mail, MapPin, Pencil, Phone, Receipt, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useRow, useRows } from '../../data/hooks';
import { put, restore, softDelete } from '../../data/repo';
import type { Client, Project } from '../../data/schema';
import { formatMoney } from '../../lib/money';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Badge, Card, EmptyState } from '../../ui/misc';
import { itemVariants, listVariants } from '../../ui/motion';
import { useToast } from '../../ui/Toast';
import { useMasterMap } from '../masters/MasterSelect';
import { ClientForm } from './ClientForm';

function InfoRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-[0.875rem]">
      <span className="mt-0.5 text-muted">{icon}</span>
      <span className="min-w-0 whitespace-pre-line break-words">{children}</span>
    </div>
  );
}

export function ClientDetailPage() {
  const { id } = useParams({ from: '/clients/$id' });
  const navigate = useNavigate();
  const client = useRow<Client>('clients', id);
  const projects = (useRows<Project>('projects') ?? []).filter((p) => p.client === id);
  const currencies = useMasterMap('currencies');
  const terms = useMasterMap('payment_terms');
  const statuses = useMasterMap('project_statuses');
  const [editing, setEditing] = useState(false);
  const { show } = useToast();

  if (client === undefined) return null;
  if (!client || client.deleted) {
    return (
      <EmptyState
        icon={<ArrowLeft size={24} />}
        title="Client not found"
        body="It may have been deleted on another device."
        action={<Link to="/clients"><Button variant="secondary">Back to clients</Button></Link>}
      />
    );
  }

  const cur = currencies.get(client.currency);

  async function remove() {
    await softDelete('clients', id);
    void navigate({ to: '/clients' });
    show(`Deleted ${client!.name}`, { action: { label: 'Undo', onClick: () => void restore('clients', id) } });
  }

  return (
    <div>
      <Link to="/clients" className="mb-6 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> Clients
      </Link>

      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
            <Avatar name={client.name} size={64} />
          </motion.div>
          <div className="min-w-0">
            <h1 className="truncate text-[2rem] font-extrabold sm:text-[2.75rem]">{client.name}</h1>
            <div className="mt-1 flex flex-wrap gap-2">
              {cur && <Badge>{cur.code}</Badge>}
              {client.archived && <Badge color="var(--warning)">Archived</Badge>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Pencil size={16} />} onClick={() => setEditing(true)}>Edit</Button>
          <Button
            variant="secondary"
            icon={client.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            onClick={() => void put<Client>('clients', { id, archived: !client.archived })}
          >
            {client.archived ? 'Unarchive' : 'Archive'}
          </Button>
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => void remove()} aria-label="Delete client" />
        </div>
      </header>

      <motion.div variants={listVariants} initial="initial" animate="animate" className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <motion.section variants={itemVariants} className="order-2 lg:order-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[1.25rem] font-bold">Projects</h2>
          </div>
          {projects.length === 0 ? (
            <EmptyState icon={<FolderKanban size={24} />} title="No projects yet" body="Projects for this client will show up here." />
          ) : (
            <ul className="flex flex-col gap-2">
              {projects.map((p) => {
                const st = statuses.get(p.status);
                return (
                  <li key={p.id}>
                    <Link
                      to="/projects/$id"
                      params={{ id: p.id }}
                      className="flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3.5 shadow-1 transition-[transform,box-shadow] duration-fast hover:-translate-y-0.5 hover:shadow-2"
                    >
                      <span className="h-8 w-1.5 rounded-full" style={{ background: p.color || st?.color || 'var(--line)' }} />
                      <span className="flex-1 truncate font-semibold">{p.name}</span>
                      {st && <Badge color={st.color}>{st.name}</Badge>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.section>

        <motion.aside variants={itemVariants} className="order-1 flex flex-col gap-5 lg:order-2">
          <Card>
            <h2 className="mb-4 text-[1rem] font-bold">Details</h2>
            <div className="flex flex-col gap-3">
              {client.contact_name && <InfoRow icon={<span className="text-[0.75rem] font-bold">@</span>}>{client.contact_name}</InfoRow>}
              {client.email && <InfoRow icon={<Mail size={16} />}><a className="hover:text-accent" href={`mailto:${client.email}`}>{client.email}</a></InfoRow>}
              {client.phone && <InfoRow icon={<Phone size={16} />}><a className="hover:text-accent" href={`tel:${client.phone}`}>{client.phone}</a></InfoRow>}
              {(client.address || client.state_region) && (
                <InfoRow icon={<MapPin size={16} />}>{[client.address, client.state_region].filter(Boolean).join('\n')}</InfoRow>
              )}
              {client.tax_id && <InfoRow icon={<Receipt size={16} />}>{client.tax_id}</InfoRow>}
              {!client.email && !client.phone && !client.address && !client.contact_name && <p className="text-[0.8125rem] text-muted">No contact details yet.</p>}
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 text-[1rem] font-bold">Billing</h2>
            <dl className="grid grid-cols-2 gap-y-3 text-[0.875rem]">
              <dt className="text-muted">Hourly rate</dt>
              <dd className="tabular text-right font-semibold">{cur ? formatMoney(client.default_hourly_rate ?? 0, { code: cur.code!, decimals: cur.decimals ?? 2 }) : '—'}</dd>
              <dt className="text-muted">Terms</dt>
              <dd className="text-right font-semibold">{terms.get(client.payment_term)?.name ?? 'Default'}</dd>
              <dt className="text-muted">Outstanding</dt>
              <dd className="text-right font-semibold text-muted" title="Invoices arrive in Phase 4">—</dd>
            </dl>
          </Card>
          {client.notes && (
            <Card>
              <h2 className="mb-2 text-[1rem] font-bold">Notes</h2>
              <p className="whitespace-pre-line text-[0.875rem] text-muted">{client.notes}</p>
            </Card>
          )}
        </motion.aside>
      </motion.div>

      <ClientForm open={editing} onClose={() => setEditing(false)} client={client} />
    </div>
  );
}
