/// <reference path="../pb_data/types.d.ts" />
// Seeds default masters, the singleton settings row, the backup schedule, and disables public sign-up.

migrate(
  (app) => {
    // Deterministic 15-char ids (e.g. "ts0000000000001") so seeds are stable across fresh installs.
    const seedId = (prefix, i) => prefix + String(i).padStart(13, '0');

    const SEEDS = {
      task_statuses: ['ts', [
        { name: 'To Do', color: '#8B90A0', meaning: 'open', is_default: true },
        { name: 'Doing', color: '#3B82F6', meaning: 'in_progress' },
        { name: 'Done', color: '#22C55E', meaning: 'closed' },
      ]],
      project_statuses: ['ps', [
        { name: 'Lead', color: '#A855F7', meaning: 'open' },
        { name: 'Active', color: '#FF5A36', meaning: 'open', is_default: true },
        { name: 'On hold', color: '#EAB308', meaning: 'open' },
        { name: 'Done', color: '#22C55E', meaning: 'closed' },
      ]],
      priorities: ['pr', [
        { name: 'Low', color: '#8B90A0', level: 1 },
        { name: 'Medium', color: '#3B82F6', level: 2, is_default: true },
        { name: 'High', color: '#F97316', level: 3 },
        { name: 'Urgent', color: '#EF4444', level: 4 },
      ]],
      currencies: ['cu', [
        { name: 'Indian Rupee', color: '#FF5A36', code: 'INR', symbol: '₹', decimals: 2, is_default: true },
        { name: 'US Dollar', color: '#22C55E', code: 'USD', symbol: '$', decimals: 2 },
        { name: 'Euro', color: '#3B82F6', code: 'EUR', symbol: '€', decimals: 2 },
        { name: 'British Pound', color: '#A855F7', code: 'GBP', symbol: '£', decimals: 2 },
      ]],
      tax_rates: ['tx', [
        { name: 'No tax', color: '#8B90A0', label: 'Tax', components: [] },
        { name: 'GST 18%', color: '#FF5A36', label: 'GST', components: [{ name: 'CGST', rate: 900 }, { name: 'SGST', rate: 900 }], is_default: true },
        { name: 'IGST 18%', color: '#F97316', label: 'GST', components: [{ name: 'IGST', rate: 1800 }] },
      ]],
      units: ['un', [
        { name: 'Hour', color: '#3B82F6', label: 'hr', is_default: true },
        { name: 'Day', color: '#22C55E', label: 'day' },
        { name: 'Item', color: '#8B90A0', label: 'item' },
      ]],
      payment_terms: ['pt', [
        { name: 'Due on receipt', color: '#EF4444', days: 0 },
        { name: 'Net 7', color: '#F97316', days: 7 },
        { name: 'Net 15', color: '#3B82F6', days: 15, is_default: true },
        { name: 'Net 30', color: '#22C55E', days: 30 },
      ]],
      payment_methods: ['pm', [
        { name: 'Bank transfer', color: '#3B82F6', is_default: true },
        { name: 'UPI', color: '#22C55E' },
        { name: 'PayPal', color: '#0EA5E9' },
        { name: 'Cash', color: '#8B90A0' },
      ]],
      expense_categories: ['ec', [
        { name: 'Software', color: '#3B82F6' },
        { name: 'Hardware', color: '#A855F7' },
        { name: 'Travel', color: '#F97316' },
        { name: 'Office', color: '#22C55E' },
        { name: 'Other', color: '#8B90A0', is_default: true },
      ]],
    };

    const now = Date.now();
    const defaults = {};
    for (const name of Object.keys(SEEDS)) {
      const [prefix, rows] = SEEDS[name];
      const col = app.findCollectionByNameOrId(name);
      rows.forEach((row, i) => {
        const rec = new Record(col);
        rec.load(Object.assign({ sort_order: i * 10, active: true, is_default: false, updated_at: now, deleted: false }, row));
        rec.set('id', seedId(prefix, i + 1));
        app.save(rec);
        if (row.is_default) defaults[name] = rec.id;
      });
    }

    const settings = new Record(app.findCollectionByNameOrId('settings'));
    settings.load({
      business_name: '', invoice_prefix: 'INV-', invoice_next_number: 1, invoice_yearly_reset: false,
      invoice_title: 'Invoice', time_rounding_minutes: 0, accent_color: '#FF5A36', timezone: 'Asia/Kolkata',
      default_currency: defaults.currencies, default_tax_rate: defaults.tax_rates, default_payment_term: defaults.payment_terms,
      default_hourly_rate: 0, reminder_prefs: {}, quiet_hours: { start: '22:00', end: '08:00' },
      updated_at: now, deleted: false,
    });
    settings.set('id', 'settings0000000');
    app.save(settings);

    const s = app.settings();
    s.backups.cron = '0 3 * * *';
    s.backups.cronMaxKeep = 14;
    app.save(s);

    const users = app.findCollectionByNameOrId('users');
    users.createRule = null;
    app.save(users);
  },
  (app) => {
    for (const name of ['task_statuses', 'project_statuses', 'priorities', 'currencies', 'tax_rates', 'units', 'payment_terms', 'payment_methods', 'expense_categories']) {
      for (const rec of app.findAllRecords(name)) app.delete(rec);
    }
    app.delete(app.findRecordById('settings', 'settings0000000'));
  },
);
