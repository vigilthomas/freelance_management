import { useEffect, useRef, useState } from 'react';
import { useRows } from '../../data/hooks';
import { put } from '../../data/repo';
import type { BillingType, Client, MasterRecord, Project } from '../../data/schema';
import { validate } from '../../lib/forms';
import { Button } from '../../ui/Button';
import { Input, Textarea } from '../../ui/Input';
import { ColorSwatch } from '../../ui/misc';
import { MoneyInput } from '../../ui/MoneyInput';
import { Select } from '../../ui/Select';
import { Sheet } from '../../ui/Sheet';
import { TagPicker } from '../../ui/TagPicker';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { MasterSelect, useMasterMap } from '../masters/MasterSelect';
import { projectSchema } from './schema';

interface Draft {
  client: string;
  name: string;
  status: string;
  billing_type: BillingType;
  hourly_rate: number | null;
  fixed_price: number | null;
  currency: string;
  start_date: string;
  due_date: string;
  budget_hours: string;
  tags: string[];
  color: string;
  notes: string;
}

function toDraft(p: Project | undefined, defaultClient?: Client, defaultStatus?: string): Draft {
  return {
    client: p?.client ?? defaultClient?.id ?? '',
    name: p?.name ?? '',
    status: p?.status ?? defaultStatus ?? '',
    billing_type: p?.billing_type ?? 'hourly',
    hourly_rate: p?.hourly_rate || null,
    fixed_price: p?.fixed_price || null,
    currency: p?.currency ?? defaultClient?.currency ?? '',
    start_date: p?.start_date ?? '',
    due_date: p?.due_date ?? '',
    budget_hours: p?.budget_minutes ? String(+(p.budget_minutes / 60).toFixed(2)) : '',
    tags: p?.tags ?? [],
    color: p?.color || '#FF5A36',
    notes: p?.notes ?? '',
  };
}

/** Budget typed in hours ("12.5") → integer minutes; NaN when invalid so validation reports it. */
function hoursToMinutes(h: string): number {
  if (!h.trim()) return 0;
  return /^\d+(\.\d+)?$/.test(h.trim()) ? Math.round(parseFloat(h) * 60) : Number.NaN;
}

export function ProjectForm({ open, onClose, project, defaultClientId, onSaved }: {
  open: boolean;
  onClose(): void;
  project?: Project;
  defaultClientId?: string;
  onSaved?(p: Project): void;
}) {
  const clients = useRows<Client>('clients', { sortBy: 'name' }) ?? [];
  const statuses = useRows<MasterRecord>('project_statuses') ?? [];
  const currencies = useMasterMap('currencies');
  const defaultStatus = statuses.find((s) => s.is_default && s.active)?.id;
  const [d, setD] = useState<Draft>(() => toDraft(project));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // Once the user picks a currency by hand, changing the client no longer overrides it.
  const currencyTouched = useRef(!!project);

  useEffect(() => {
    if (!open) return;
    currencyTouched.current = !!project;
    setD(toDraft(project, clients.find((c) => c.id === defaultClientId), defaultStatus));
    setErrors({});
  }, [open, project]); // eslint-disable-line react-hooks/exhaustive-deps

  // Status default arrives asynchronously from the local DB.
  useEffect(() => {
    if (open && !d.status && defaultStatus) setD((x) => ({ ...x, status: defaultStatus }));
  }, [open, defaultStatus, d.status]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const cur = currencies.get(d.currency);
  const clientOptions = clients.filter((c) => !c.archived || c.id === d.client).map((c) => ({ value: c.id, label: c.name }));

  function pickClient(id: string) {
    const c = clients.find((x) => x.id === id);
    setD((x) => ({ ...x, client: id, currency: !currencyTouched.current && c?.currency ? c.currency : x.currency }));
  }

  async function save() {
    const data = {
      client: d.client, name: d.name, status: d.status, billing_type: d.billing_type,
      hourly_rate: d.hourly_rate ?? 0, fixed_price: d.billing_type === 'fixed' ? (d.fixed_price ?? 0) : 0,
      currency: d.currency, start_date: d.start_date, due_date: d.due_date,
      budget_minutes: hoursToMinutes(d.budget_hours), tags: d.tags, color: d.color, notes: d.notes,
    };
    const r = validate(projectSchema, data);
    const errs = r.errors ?? {};
    if (errs.budget_minutes) errs.budget_hours = 'Enter hours like 40 or 12.5';
    setErrors(errs);
    if (!r.data) return;
    setSaving(true);
    const saved = await put<Project>('projects', { id: project?.id, ...r.data });
    setSaving(false);
    onSaved?.(saved);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={project ? 'Edit project' : 'New project'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void save()} loading={saving}>{project ? 'Save' : 'Create project'}</Button>
        </>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Input label="Project name" value={d.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Select label="Client" value={d.client} onChange={pickClient} options={clientOptions} placeholder="Choose…" error={errors.client} />
          <MasterSelect kind="project_statuses" label="Status" value={d.status} onChange={(v) => set('status', v)} error={errors.status} placeholder="Choose…" />
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-line p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.875rem] font-semibold">Billing</span>
            <SegmentedControl<BillingType>
              id="billing"
              value={d.billing_type}
              onChange={(v) => set('billing_type', v)}
              options={[{ value: 'hourly', label: 'Hourly' }, { value: 'fixed', label: 'Fixed price' }]}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <MasterSelect
              kind="currencies"
              label="Currency"
              value={d.currency}
              onChange={(v) => {
                currencyTouched.current = true;
                set('currency', v);
              }}
              error={errors.currency}
              placeholder="Choose…"
            />
            {d.billing_type === 'hourly' ? (
              <MoneyInput
                label="Hourly rate"
                value={d.hourly_rate}
                decimals={cur?.decimals ?? 2}
                symbol={cur?.symbol}
                onChange={(v) => set('hourly_rate', v)}
                error={errors.hourly_rate}
                hint="Empty = use the client’s rate"
              />
            ) : (
              <MoneyInput
                label="Fixed price"
                value={d.fixed_price}
                decimals={cur?.decimals ?? 2}
                symbol={cur?.symbol}
                onChange={(v) => set('fixed_price', v)}
                error={errors.fixed_price}
              />
            )}
          </div>
          <Input
            label="Budget (hours)"
            inputMode="decimal"
            value={d.budget_hours}
            onChange={(e) => set('budget_hours', e.target.value)}
            error={errors.budget_hours}
            placeholder="Optional"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Start date" type="date" value={d.start_date} onChange={(e) => set('start_date', e.target.value)} error={errors.start_date} />
          <Input label="Due date" type="date" value={d.due_date} onChange={(e) => set('due_date', e.target.value)} error={errors.due_date} />
        </div>
        <TagPicker value={d.tags} onChange={(v) => set('tags', v)} />
        <ColorSwatch value={d.color} onChange={(c) => set('color', c)} label="Project color" />
        <Textarea label="Notes" value={d.notes} onChange={(e) => set('notes', e.target.value)} rows={4} />
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
