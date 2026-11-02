/// <reference path="../pb_data/types.d.ts" />
// Phase 1 schema: settings, masters, clients, projects.
// References between records are plain text ids (client enforces integrity) so sync order never trips FK checks.

migrate(
  (app) => {
    const OWNER = '@request.auth.id != ""';

    const text = (name, extra) => Object.assign({ name, type: 'text' }, extra || {});
    const int = (name) => ({ name, type: 'number', onlyInt: true });
    const bool = (name) => ({ name, type: 'bool' });
    const json = (name) => ({ name, type: 'json', maxSize: 200000 });

    const SYNC_FIELDS = [
      int('updated_at'),
      bool('deleted'),
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ];

    const MASTER_FIELDS = [text('name'), text('color'), int('sort_order'), bool('active'), bool('is_default')];

    const COLLECTIONS = {
      settings: [
        text('business_name'), text('address', { max: 2000 }), text('email'), text('phone'), text('tax_id'),
        { name: 'logo', type: 'file', maxSelect: 1, maxSize: 5242880, mimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'], protected: true },
        text('default_currency'), text('default_tax_rate'), text('default_payment_term'), int('default_hourly_rate'),
        text('invoice_prefix'), int('invoice_next_number'), bool('invoice_yearly_reset'), text('invoice_title'),
        text('payment_instructions', { max: 5000 }), int('time_rounding_minutes'), text('accent_color'),
        json('reminder_prefs'), json('quiet_hours'), text('timezone'),
      ],
      project_statuses: [...MASTER_FIELDS, text('meaning')],
      task_statuses: [...MASTER_FIELDS, text('meaning')],
      priorities: [...MASTER_FIELDS, int('level')],
      expense_categories: [...MASTER_FIELDS],
      tags: [...MASTER_FIELDS],
      units: [...MASTER_FIELDS, text('label')],
      payment_terms: [...MASTER_FIELDS, int('days')],
      payment_methods: [...MASTER_FIELDS],
      currencies: [...MASTER_FIELDS, text('code'), text('symbol'), int('decimals')],
      tax_rates: [...MASTER_FIELDS, text('label'), json('components')],
      clients: [
        text('name'), text('contact_name'), text('email'), text('phone'), text('address', { max: 2000 }), text('state_region'),
        text('tax_id'), text('currency'), int('default_hourly_rate'), text('payment_term'), text('notes', { max: 10000 }), bool('archived'),
      ],
      projects: [
        text('client'), text('name'), text('status'), text('billing_type'), int('hourly_rate'), int('fixed_price'), text('currency'),
        text('start_date'), text('due_date'), int('budget_minutes'), json('tags'), text('color'), text('notes', { max: 10000 }),
      ],
    };

    for (const name of Object.keys(COLLECTIONS)) {
      app.save(
        new Collection({
          type: 'base',
          name,
          listRule: OWNER,
          viewRule: OWNER,
          createRule: OWNER,
          updateRule: OWNER,
          deleteRule: OWNER,
          fields: [...COLLECTIONS[name], ...SYNC_FIELDS],
          indexes: [`CREATE INDEX idx_${name}_updated ON ${name} (updated)`],
        }),
      );
    }
  },
  (app) => {
    const names = ['projects', 'clients', 'tax_rates', 'currencies', 'payment_methods', 'payment_terms', 'units', 'tags',
      'expense_categories', 'priorities', 'task_statuses', 'project_statuses', 'settings'];
    for (const name of names) app.delete(app.findCollectionByNameOrId(name));
  },
);
