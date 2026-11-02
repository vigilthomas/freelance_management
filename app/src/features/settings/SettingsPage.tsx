import { motion } from 'framer-motion';
import { LogOut, Monitor, Moon, RefreshCw, Sun } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { useRow } from '../../data/hooks';
import { put } from '../../data/repo';
import { SETTINGS_ID, type Settings } from '../../data/schema';
import { validate } from '../../lib/forms';
import { PageHeader } from '../../shell/PageHeader';
import { requestSync } from '../../sync/engine';
import { useSyncStatus } from '../../sync/status';
import { Button } from '../../ui/Button';
import { cn } from '../../ui/cn';
import { Dialog } from '../../ui/Dialog';
import { Input, Textarea } from '../../ui/Input';
import { ColorSwatch } from '../../ui/misc';
import { MoneyInput } from '../../ui/MoneyInput';
import { itemVariants, listVariants } from '../../ui/motion';
import { Select } from '../../ui/Select';
import { useTheme, type ThemeMode } from '../../ui/theme';
import { useToast } from '../../ui/Toast';
import { Toggle } from '../../ui/Toggle';
import { MasterSelect, useMasterMap } from '../masters/MasterSelect';
import { BackupSection } from './BackupSection';
import { LogoField } from './LogoField';
import { settingsSchema, type SettingsForm } from './schema';

type Draft = Omit<SettingsForm, 'default_hourly_rate'> & { default_hourly_rate: number | null };

function toDraft(s: Settings): Draft {
  return {
    business_name: s.business_name ?? '', address: s.address ?? '', email: s.email ?? '', phone: s.phone ?? '', tax_id: s.tax_id ?? '',
    default_currency: s.default_currency ?? '', default_tax_rate: s.default_tax_rate ?? '', default_payment_term: s.default_payment_term ?? '',
    default_hourly_rate: s.default_hourly_rate ?? 0, invoice_prefix: s.invoice_prefix ?? '', invoice_next_number: s.invoice_next_number ?? 1,
    invoice_yearly_reset: !!s.invoice_yearly_reset, invoice_title: s.invoice_title || 'Invoice', payment_instructions: s.payment_instructions ?? '',
    time_rounding_minutes: (s.time_rounding_minutes ?? 0) as SettingsForm['time_rounding_minutes'],
    accent_color: s.accent_color || '#FF5A36', timezone: s.timezone || 'Asia/Kolkata',
  };
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <motion.section variants={itemVariants} className="grid gap-6 rounded-lg border border-line bg-surface p-6 shadow-1 md:grid-cols-[220px_1fr]">
      <div>
        <h2 className="text-[1.125rem] font-bold">{title}</h2>
        {description && <p className="mt-1 text-[0.8125rem] text-muted">{description}</p>}
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </motion.section>
  );
}

const THEMES: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'System', icon: Monitor },
];

export function SettingsPage() {
  const settings = useRow<Settings>('settings', SETTINGS_ID);
  const currencies = useMasterMap('currencies');
  const { user, logout } = useAuth();
  const { mode, setMode } = useTheme();
  const sync = useSyncStatus();
  const { show } = useToast();
  const [d, setD] = useState<Draft | null>(null);
  const [logo, setLogo] = useState<Blob | null | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (settings && !d) setD(toDraft(settings));
  }, [settings, d]);

  // Live accent preview while editing; ThemeProvider restores the saved one on unmount.
  useEffect(() => {
    if (d && /^#[0-9a-f]{6}$/i.test(d.accent_color)) document.documentElement.style.setProperty('--accent', d.accent_color);
    return () => {
      if (settings?.accent_color) document.documentElement.style.setProperty('--accent', settings.accent_color);
    };
  }, [d?.accent_color, settings?.accent_color]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!settings || !d) return <PageHeader title="Settings" />;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => (x ? { ...x, [k]: v } : x));
  const cur = currencies.get(d.default_currency);

  async function save() {
    const r = validate(settingsSchema, d);
    setErrors(r.errors ?? {});
    if (!r.data) {
      show('Check the highlighted fields');
      return;
    }
    setSaving(true);
    await put<Settings>('settings', { id: SETTINGS_ID, ...r.data }, logo === undefined ? undefined : { logo });
    setLogo(undefined);
    setSaving(false);
    show('Settings saved');
  }

  async function doLogout(force = false) {
    if ((await logout({ force })) === 'pending') setConfirmLogout(true);
  }

  return (
    <div className="pb-20">
      <PageHeader title="Settings" subtitle="Your business details and how the app behaves." />
      <motion.form
        variants={listVariants}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Section title="Business" description="Shown on invoices and exports.">
          <LogoField settings={settings} picked={logo} onPick={setLogo} />
          <Input label="Business name" value={d.business_name} onChange={(e) => set('business_name', e.target.value)} error={errors.business_name} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Email" type="email" value={d.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
            <Input label="Phone" value={d.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} />
          </div>
          <Input label="Tax ID (GSTIN / VAT)" value={d.tax_id} onChange={(e) => set('tax_id', e.target.value)} error={errors.tax_id} />
          <Textarea label="Address" value={d.address} onChange={(e) => set('address', e.target.value)} error={errors.address} />
        </Section>

        <Section title="Invoicing" description="Defaults for new clients and invoices.">
          <div className="grid gap-5 sm:grid-cols-2">
            <MasterSelect kind="currencies" label="Default currency" value={d.default_currency} onChange={(v) => set('default_currency', v)} error={errors.default_currency} />
            <MoneyInput
              label="Default hourly rate"
              value={d.default_hourly_rate}
              decimals={cur?.decimals ?? 2}
              symbol={cur?.symbol}
              onChange={(v) => set('default_hourly_rate', v)}
              error={errors.default_hourly_rate}
            />
            <MasterSelect kind="tax_rates" label="Default tax" value={d.default_tax_rate} onChange={(v) => set('default_tax_rate', v)} />
            <MasterSelect kind="payment_terms" label="Default payment terms" value={d.default_payment_term} onChange={(v) => set('default_payment_term', v)} />
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Input label="Invoice title" value={d.invoice_title} onChange={(e) => set('invoice_title', e.target.value)} error={errors.invoice_title} hint="e.g. Tax Invoice" />
            <Input label="Number prefix" value={d.invoice_prefix} onChange={(e) => set('invoice_prefix', e.target.value)} error={errors.invoice_prefix} />
            <Input
              label="Next number"
              inputMode="numeric"
              value={Number.isNaN(d.invoice_next_number) ? '' : String(d.invoice_next_number)}
              onChange={(e) => set('invoice_next_number', e.target.value === '' ? Number.NaN : Number(e.target.value))}
              error={errors.invoice_next_number}
              hint={`Next: ${d.invoice_prefix}${d.invoice_yearly_reset ? `${new Date().getFullYear()}-` : ''}${String(d.invoice_next_number || 1).padStart(3, '0')}`}
            />
          </div>
          <Toggle label="Restart numbering every year" checked={d.invoice_yearly_reset} onChange={(v) => set('invoice_yearly_reset', v)} />
          <Textarea
            label="Payment instructions"
            value={d.payment_instructions}
            onChange={(e) => set('payment_instructions', e.target.value)}
            placeholder="Bank, account number, IFSC / UPI ID…"
            rows={4}
          />
        </Section>

        <Section title="Time tracking" description="How logged time is rounded on invoices.">
          <Select
            label="Round time to"
            value={String(d.time_rounding_minutes)}
            onChange={(v) => set('time_rounding_minutes', Number(v) as Draft['time_rounding_minutes'])}
            options={[
              { value: '0', label: 'No rounding' },
              { value: '6', label: '6 minutes (0.1 h)' },
              { value: '15', label: '15 minutes' },
              { value: '30', label: '30 minutes' },
            ]}
            error={errors.time_rounding_minutes}
          />
        </Section>

        <Section title="Appearance" description="Theme is per device; accent syncs everywhere.">
          <div className="flex gap-2" role="radiogroup" aria-label="Theme">
            {THEMES.map(({ mode: m, label, icon: Icon }) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'relative flex flex-1 flex-col items-center gap-2 rounded-md border px-3 py-4 text-[0.8125rem] font-semibold transition-colors duration-fast',
                  mode === m ? 'border-accent text-ink' : 'border-line text-muted hover:text-ink',
                )}
              >
                {mode === m && <motion.span layoutId="theme-pick" className="absolute inset-0 rounded-md bg-accent-soft" />}
                <Icon size={20} className="relative" />
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
          <ColorSwatch label="Accent color" value={d.accent_color} onChange={(c) => set('accent_color', c)} />
          {errors.accent_color && <p className="text-[0.75rem] text-danger">{errors.accent_color}</p>}
        </Section>

        <Section title="Sync" description="Changes save on this device first, then sync.">
          <dl className="grid grid-cols-2 gap-3 text-[0.875rem]">
            <dt className="text-muted">Status</dt>
            <dd className="font-semibold capitalize">{sync.authExpired ? 'Sign in needed' : sync.state}</dd>
            <dt className="text-muted">Pending changes</dt>
            <dd className="tabular font-semibold">{sync.pending}</dd>
            <dt className="text-muted">Last synced</dt>
            <dd className="font-semibold">{sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleString() : 'Never'}</dd>
          </dl>
          <Button variant="secondary" className="self-start" icon={<RefreshCw size={16} />} onClick={() => requestSync()}>
            Sync now
          </Button>
        </Section>

        <BackupSection />

        <Section title="Account" description={user?.email}>
          <Button variant="danger" className="self-start" icon={<LogOut size={16} />} onClick={() => void doLogout()}>
            Log out of this device
          </Button>
        </Section>

        <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex justify-end lg:bottom-6">
          <Button type="submit" loading={saving} className="h-12 px-6 shadow-3">
            Save settings
          </Button>
        </div>
      </motion.form>

      <Dialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Unsynced changes"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmLogout(false)}>Stay signed in</Button>
            <Button variant="danger" onClick={() => void doLogout(true)}>Log out anyway</Button>
          </>
        }
      >
        {sync.pending} change{sync.pending === 1 ? '' : 's'} haven’t reached the server yet. Logging out now deletes them from this device.
      </Dialog>
    </div>
  );
}
