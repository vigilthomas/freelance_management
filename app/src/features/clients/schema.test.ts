import { clientSchema } from './schema';

const ok = {
  name: 'Acme', contact_name: '', email: '', phone: '', address: '', state_region: '', tax_id: '',
  currency: 'cu0000000000001', default_hourly_rate: 150000, payment_term: '', notes: '',
};
const errs = (x: object) => {
  const r = clientSchema.safeParse(x);
  return r.success ? {} : r.error.flatten().fieldErrors;
};

test('clientSchema accepts a minimal client', () => expect(errs(ok)).toEqual({}));
test('clientSchema rejects empty name', () => expect(errs({ ...ok, name: '  ' }).name).toBeDefined());
test('clientSchema requires a currency', () => expect(errs({ ...ok, currency: '' }).currency).toBeDefined());
test('clientSchema rejects invalid email', () => expect(errs({ ...ok, email: 'x@' }).email).toBeDefined());
test('clientSchema rejects missing or negative rate', () => {
  expect(errs({ ...ok, default_hourly_rate: null }).default_hourly_rate).toBeDefined();
  expect(errs({ ...ok, default_hourly_rate: -5 }).default_hourly_rate).toBeDefined();
});
