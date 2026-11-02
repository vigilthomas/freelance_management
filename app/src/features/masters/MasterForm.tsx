import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { put } from '../../data/repo';
import type { MasterKind, MasterRecord, StatusMeaning } from '../../data/schema';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { ColorSwatch } from '../../ui/misc';
import { Select } from '../../ui/Select';
import { Sheet } from '../../ui/Sheet';
import { Toggle } from '../../ui/Toggle';
import { setDefault } from './actions';
import { MASTER_CONFIG } from './config';
import { componentsToDrafts, draftsToComponents, TaxComponentsEditor, type ComponentDraft } from './TaxComponentsEditor';

interface Draft {
  name: string;
  color: string;
  active: boolean;
  is_default: boolean;
  meaning: string;
  level: string;
  label: string;
  days: string;
  code: string;
  symbol: string;
  decimals: string;
  components: ComponentDraft[];
}

type Errors = Partial<Record<keyof Draft, string>>;

function toDraft(r: MasterRecord | undefined): Draft {
  return {
    name: r?.name ?? '',
    color: r?.color ?? '#FF5A36',
    active: r?.active ?? true,
    is_default: r?.is_default ?? false,
    meaning: r?.meaning ?? 'open',
    level: String(r?.level ?? 1),
    label: r?.label ?? '',
    days: String(r?.days ?? 0),
    code: r?.code ?? '',
    symbol: r?.symbol ?? '',
    decimals: String(r?.decimals ?? 2),
    components: componentsToDrafts(r?.components),
  };
}

const isInt = (s: string, min: number, max: number) => /^\d+$/.test(s) && +s >= min && +s <= max;

export function validateMaster(kind: MasterKind, d: Draft): Errors {
  const fields = MASTER_CONFIG[kind].extraFields;
  const e: Errors = {};
  if (!d.name.trim()) e.name = 'Name is required';
  if (fields.includes('level') && !isInt(d.level, 0, 99)) e.level = 'Whole number 0–99';
  if (fields.includes('days') && !isInt(d.days, 0, 365)) e.days = 'Whole number of days 0–365';
  if (fields.includes('decimals') && !isInt(d.decimals, 0, 4)) e.decimals = '0 to 4';
  if (fields.includes('code') && !/^[A-Z]{3}$/.test(d.code)) e.code = 'Three-letter ISO code, e.g. INR';
  if (fields.includes('symbol') && !d.symbol.trim()) e.symbol = 'Symbol is required';
  if (fields.includes('components') && draftsToComponents(d.components) === null) e.components = 'Each part needs a name and a percent between 0 and 100';
  return e;
}

export function MasterForm({ kind, record, open, onClose, nextSortOrder, onDelete }: {
  kind: MasterKind;
  record?: MasterRecord;
  open: boolean;
  onClose(): void;
  nextSortOrder: number;
  onDelete?(r: MasterRecord): void;
}) {
  const cfg = MASTER_CONFIG[kind];
  const [d, setD] = useState<Draft>(() => toDraft(record));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setD(toDraft(record));
      setErrors({});
    }
  }, [open, record]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const has = (f: string) => cfg.extraFields.includes(f as never);

  async function save() {
    const e = validateMaster(kind, d);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const data: Partial<MasterRecord> = {
      id: record?.id,
      name: d.name.trim(),
      color: d.color,
      active: d.active,
      is_default: record?.is_default ?? false,
      sort_order: record?.sort_order ?? nextSortOrder,
    };
    if (has('meaning')) data.meaning = d.meaning as StatusMeaning;
    if (has('level')) data.level = +d.level;
    if (has('label')) data.label = d.label.trim();
    if (has('days')) data.days = +d.days;
    if (has('code')) data.code = d.code;
    if (has('symbol')) data.symbol = d.symbol.trim();
    if (has('decimals')) data.decimals = +d.decimals;
    if (has('components')) data.components = draftsToComponents(d.components)!;
    const saved = await put<MasterRecord>(kind, data);
    if (d.is_default && !saved.is_default) await setDefault(kind, saved.id);
    setSaving(false);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={record ? `Edit ${cfg.singular}` : `New ${cfg.singular}`}
      footer={
        <>
          {record && onDelete && (
            <Button variant="danger" className="mr-auto" icon={<Trash2 size={15} />} onClick={() => onDelete(record)}>
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save</Button>
        </>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Input label="Name" value={d.name} onChange={(e) => set('name', e.target.value)} error={errors.name} autoFocus />
        {has('meaning') && (
          <Select label="Counts as" value={d.meaning} onChange={(v) => set('meaning', v)} options={cfg.meaningOptions ?? []} />
        )}
        {has('code') && (
          <div className="grid grid-cols-3 gap-3">
            <Input label="Code" value={d.code} maxLength={3} onChange={(e) => set('code', e.target.value.toUpperCase())} error={errors.code} />
            <Input label="Symbol" value={d.symbol} onChange={(e) => set('symbol', e.target.value)} error={errors.symbol} />
            <Input label="Decimals" inputMode="numeric" value={d.decimals} onChange={(e) => set('decimals', e.target.value)} error={errors.decimals} />
          </div>
        )}
        {has('level') && <Input label="Level" inputMode="numeric" value={d.level} onChange={(e) => set('level', e.target.value)} error={errors.level} hint="Higher sorts first" />}
        {has('days') && <Input label="Days until due" inputMode="numeric" value={d.days} onChange={(e) => set('days', e.target.value)} error={errors.days} />}
        {has('label') && (
          <Input
            label={kind === 'tax_rates' ? 'Tax label on invoices' : 'Short label'}
            value={d.label}
            onChange={(e) => set('label', e.target.value)}
            hint={kind === 'tax_rates' ? 'e.g. GST or VAT' : 'e.g. hr, day'}
          />
        )}
        {has('components') && <TaxComponentsEditor value={d.components} onChange={(v) => set('components', v)} error={errors.components} />}
        <ColorSwatch value={d.color} onChange={(c) => set('color', c)} />
        <div className="flex flex-col gap-2 rounded-lg border border-line p-4">
          <Toggle label="Active" hint="Inactive values stay on old records but can’t be picked." checked={d.active} onChange={(v) => set('active', v)} />
          <Toggle label="Default" hint="Pre-selected on new records." checked={d.is_default} onChange={(v) => set('is_default', v)} />
        </div>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
