import { settingsSchema } from './schema';

// The seed row from server/pb_migrations/1730500001_seed.js, plus the business name the user must add.
const seeded = {
  business_name: 'Studio Vigil',
  address: '',
  email: '',
  phone: '',
  tax_id: '',
  default_currency: 'cu0000000000001',
  default_tax_rate: 'tx0000000000002',
  default_payment_term: 'pt0000000000003',
  default_hourly_rate: 0,
  invoice_prefix: 'INV-',
  invoice_next_number: 1,
  invoice_yearly_reset: false,
  invoice_title: 'Invoice',
  payment_instructions: '',
  time_rounding_minutes: 0,
  accent_color: '#FF5A36',
  timezone: 'Asia/Kolkata',
};

const issues = (data: object) => {
  const r = settingsSchema.safeParse(data);
  return r.success ? {} : r.error.flatten().fieldErrors;
};

test('accepts seeded defaults', () => expect(issues(seeded)).toEqual({}));
test('rejects accent "red"', () => expect(issues({ ...seeded, accent_color: 'red' }).accent_color).toBeDefined());
test('rejects invoice_next_number 0', () => expect(issues({ ...seeded, invoice_next_number: 0 }).invoice_next_number).toBeDefined());
test('rejects time_rounding 10', () => expect(issues({ ...seeded, time_rounding_minutes: 10 }).time_rounding_minutes).toBeDefined());
test('rejects empty business name', () => expect(issues({ ...seeded, business_name: ' ' }).business_name).toBeDefined());
test('rejects long invoice prefix', () => expect(issues({ ...seeded, invoice_prefix: 'X'.repeat(13) }).invoice_prefix).toBeDefined());
test('rejects negative hourly rate', () => expect(issues({ ...seeded, default_hourly_rate: -1 }).default_hourly_rate).toBeDefined());
test('rejects bad email', () => expect(issues({ ...seeded, email: 'nope' }).email).toBeDefined());
