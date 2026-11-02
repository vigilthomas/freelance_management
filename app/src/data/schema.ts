export const MASTER_KINDS = [
  'project_statuses',
  'task_statuses',
  'priorities',
  'expense_categories',
  'tags',
  'units',
  'payment_terms',
  'payment_methods',
  'currencies',
  'tax_rates',
] as const;
export type MasterKind = (typeof MASTER_KINDS)[number];

export const SYNCED_COLLECTIONS = ['settings', ...MASTER_KINDS, 'clients', 'projects'] as const;
export type CollectionName = (typeof SYNCED_COLLECTIONS)[number];

export const SETTINGS_ID = 'settings0000000';

export interface BaseRecord {
  id: string;
  updated_at: number;
  deleted: boolean;
}

export type StatusMeaning = 'open' | 'in_progress' | 'closed';

export interface TaxComponent {
  name: string;
  /** basis points: 900 = 9% */
  rate: number;
}

export interface MasterRecord extends BaseRecord {
  name: string;
  color: string;
  sort_order: number;
  active: boolean;
  is_default: boolean;
  meaning?: StatusMeaning;
  level?: number;
  label?: string;
  days?: number;
  code?: string;
  symbol?: string;
  decimals?: number;
  components?: TaxComponent[];
}

export interface ReminderPrefs {
  [key: string]: unknown;
}

export interface Settings extends BaseRecord {
  business_name: string;
  address: string;
  email: string;
  phone: string;
  tax_id: string;
  /** server filename; local blob lives in the outbox until uploaded */
  logo: string;
  default_currency: string;
  default_tax_rate: string;
  default_payment_term: string;
  default_hourly_rate: number;
  invoice_prefix: string;
  invoice_next_number: number;
  invoice_yearly_reset: boolean;
  invoice_title: string;
  payment_instructions: string;
  time_rounding_minutes: number;
  accent_color: string;
  reminder_prefs: ReminderPrefs;
  quiet_hours: { start: string; end: string };
  timezone: string;
}

export interface Client extends BaseRecord {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  state_region: string;
  tax_id: string;
  currency: string;
  default_hourly_rate: number;
  payment_term: string;
  notes: string;
  archived: boolean;
}

export type BillingType = 'hourly' | 'fixed';

export interface Project extends BaseRecord {
  client: string;
  name: string;
  status: string;
  billing_type: BillingType;
  hourly_rate: number;
  fixed_price: number;
  currency: string;
  start_date: string;
  due_date: string;
  budget_minutes: number;
  tags: string[];
  color: string;
  notes: string;
}
