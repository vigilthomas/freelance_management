import { projectSchema } from './schema';

const ok = {
  client: 'c1', name: 'Website', status: 's1', billing_type: 'hourly' as const, hourly_rate: 0, fixed_price: 0,
  currency: 'cu1', start_date: '', due_date: '', budget_minutes: 0, tags: [], color: '', notes: '',
};
const errs = (x: object) => {
  const r = projectSchema.safeParse(x);
  return r.success ? {} : r.error.flatten().fieldErrors;
};

test('accepts a minimal hourly project', () => expect(errs(ok)).toEqual({}));
test('fixed billing requires fixed_price', () => {
  expect(errs({ ...ok, billing_type: 'fixed', fixed_price: 0 }).fixed_price).toBeDefined();
  expect(errs({ ...ok, billing_type: 'fixed', fixed_price: 5000000 })).toEqual({});
});
test('due before start rejected', () => {
  expect(errs({ ...ok, start_date: '2026-11-10', due_date: '2026-11-01' }).due_date).toBeDefined();
  expect(errs({ ...ok, start_date: '2026-11-01', due_date: '2026-11-01' })).toEqual({});
});
test('requires client, name, status, currency', () => {
  const e = errs({ ...ok, client: '', name: ' ', status: '', currency: '' });
  expect(Object.keys(e).sort()).toEqual(['client', 'currency', 'name', 'status']);
});
test('rejects negative rate and budget', () => {
  expect(errs({ ...ok, hourly_rate: -1 }).hourly_rate).toBeDefined();
  expect(errs({ ...ok, budget_minutes: -30 }).budget_minutes).toBeDefined();
});
