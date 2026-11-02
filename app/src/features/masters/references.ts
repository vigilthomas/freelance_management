import type { CollectionName, MasterKind } from '../../data/schema';

export interface MasterReference {
  collection: CollectionName;
  field: string;
  array?: boolean;
}

/** Where each master is referenced. Later phases append their collections here. */
export const MASTER_REFERENCES: Record<MasterKind, MasterReference[]> = {
  currencies: [
    { collection: 'clients', field: 'currency' },
    { collection: 'projects', field: 'currency' },
    { collection: 'settings', field: 'default_currency' },
  ],
  payment_terms: [
    { collection: 'clients', field: 'payment_term' },
    { collection: 'settings', field: 'default_payment_term' },
  ],
  tax_rates: [{ collection: 'settings', field: 'default_tax_rate' }],
  project_statuses: [{ collection: 'projects', field: 'status' }],
  tags: [{ collection: 'projects', field: 'tags', array: true }],
  task_statuses: [],
  priorities: [],
  expense_categories: [],
  units: [],
  payment_methods: [],
};
