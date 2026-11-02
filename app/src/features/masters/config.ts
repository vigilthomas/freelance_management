import type { MasterKind } from '../../data/schema';

export type MasterExtraField = 'meaning' | 'level' | 'label' | 'days' | 'code' | 'symbol' | 'decimals' | 'components';

export interface MasterKindConfig {
  title: string;
  singular: string;
  description: string;
  extraFields: MasterExtraField[];
  meaningOptions?: { value: string; label: string }[];
}

const OPEN_CLOSED = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
];

export const MASTER_CONFIG: Record<MasterKind, MasterKindConfig> = {
  project_statuses: {
    title: 'Project statuses', singular: 'project status', extraFields: ['meaning'], meaningOptions: OPEN_CLOSED,
    description: 'Each status is open or closed, so “active projects” works whatever you name them.',
  },
  task_statuses: {
    title: 'Task statuses', singular: 'task status', extraFields: ['meaning'],
    meaningOptions: [{ value: 'open', label: 'Open' }, { value: 'in_progress', label: 'In progress' }, { value: 'closed', label: 'Closed' }],
    description: 'Board columns, in this order. Closed statuses count as done.',
  },
  priorities: { title: 'Priorities', singular: 'priority', extraFields: ['level'], description: 'Higher level sorts first.' },
  tags: { title: 'Tags', singular: 'tag', extraFields: [], description: 'Free labels for projects and tasks.' },
  currencies: {
    title: 'Currencies', singular: 'currency', extraFields: ['code', 'symbol', 'decimals'],
    description: 'Clients and projects bill in one of these. Use ISO codes (INR, USD…).',
  },
  tax_rates: {
    title: 'Tax rates', singular: 'tax rate', extraFields: ['label', 'components'],
    description: 'A rate can have parts, e.g. GST 18% = CGST 9% + SGST 9%.',
  },
  payment_terms: { title: 'Payment terms', singular: 'payment term', extraFields: ['days'], description: 'Days until an invoice is due.' },
  payment_methods: { title: 'Payment methods', singular: 'payment method', extraFields: [], description: 'How clients pay you.' },
  units: { title: 'Units', singular: 'unit', extraFields: ['label'], description: 'Quantities on invoice lines.' },
  expense_categories: { title: 'Expense categories', singular: 'category', extraFields: [], description: 'Group your expenses for reports.' },
};

/** Tab order on the Masters screen. */
export const MASTER_TABS: MasterKind[] = [
  'project_statuses', 'task_statuses', 'priorities', 'tags', 'currencies',
  'tax_rates', 'payment_terms', 'payment_methods', 'units', 'expense_categories',
];
