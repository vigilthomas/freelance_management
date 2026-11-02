import { useEffect, useState } from 'react';
import { useRow } from '../../data/hooks';
import { put } from '../../data/repo';
import { SETTINGS_ID, type Client, type Settings } from '../../data/schema';
import { validate } from '../../lib/forms';
import { Button } from '../../ui/Button';
import { Input, Textarea } from '../../ui/Input';
import { MoneyInput } from '../../ui/MoneyInput';
import { Sheet } from '../../ui/Sheet';
import { MasterSelect, useMasterMap } from '../masters/MasterSelect';
import { clientSchema, type ClientForm as ClientDraftValid } from './schema';

type Draft = Omit<ClientDraftValid, 'default_hourly_rate'> & { default_hourly_rate: number | null };

function toDraft(c: Client | undefined, s: Settings | undefined): Draft {
  return {
    name: c?.name ?? '', contact_name: c?.contact_name ?? '', email: c?.email ?? '', phone: c?.phone ?? '',
    address: c?.address ?? '', state_region: c?.state_region ?? '', tax_id: c?.tax_id ?? '',
    currency: c?.currency ?? s?.default_currency ?? '',
    default_hourly_rate: c?.default_hourly_rate ?? s?.default_hourly_rate ?? 0,
    payment_term: c?.payment_term ?? s?.default_payment_term ?? '',
    notes: c?.notes ?? '',
  };
}

export function ClientForm({ open, onClose, client, onSaved }: { open: boolean; onClose(): void; client?: Client; onSaved?(c: Client): void }) {
  const settings = useRow<Settings>('settings', SETTINGS_ID);
  const currencies = useMasterMap('currencies');
  const [d, setD] = useState<Draft>(() => toDraft(client, settings));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setD(toDraft(client, settings));
      setErrors({});
    }
  }, [open, client]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const cur = currencies.get(d.currency);

  async function save() {
    const r = validate(clientSchema, d);
    setErrors(r.errors ?? {});
    if (!r.data) return;
    setSaving(true);
    const saved = await put<Client>('clients', { id: client?.id, archived: client?.archived ?? false, ...r.data });
    setSaving(false);
    onSaved?.(saved);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={client ? 'Edit client' : 'New client'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void save()} loading={saving}>{client ? 'Save' : 'Add client'}</Button>
        </>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Input label="Client / company name" value={d.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Contact person" value={d.contact_name} onChange={(e) => set('contact_name', e.target.value)} />
          <Input label="Email" type="email" value={d.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
          <Input label="Phone" type="tel" value={d.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} />
          <Input label="Tax ID (GSTIN / VAT)" value={d.tax_id} onChange={(e) => set('tax_id', e.target.value)} error={errors.tax_id} />
        </div>
        <Textarea label="Address" value={d.address} onChange={(e) => set('address', e.target.value)} />
        <Input label="State / region" value={d.state_region} onChange={(e) => set('state_region', e.target.value)} hint="Used to pick CGST+SGST vs IGST" />
        <div className="grid gap-5 sm:grid-cols-2">
          <MasterSelect kind="currencies" label="Currency" value={d.currency} onChange={(v) => set('currency', v)} error={errors.currency} placeholder="Choose…" />
          <MoneyInput
            label="Default hourly rate"
            value={d.default_hourly_rate}
            decimals={cur?.decimals ?? 2}
            symbol={cur?.symbol}
            onChange={(v) => set('default_hourly_rate', v)}
            error={errors.default_hourly_rate}
          />
        </div>
        <MasterSelect kind="payment_terms" label="Payment terms" value={d.payment_term} onChange={(v) => set('payment_term', v)} placeholder="Use default" />
        <Textarea label="Notes" value={d.notes} onChange={(e) => set('notes', e.target.value)} rows={4} />
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
