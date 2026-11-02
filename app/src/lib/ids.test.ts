import { newId } from './ids';

test('newId is 15 lowercase alphanumerics', () => {
  expect(newId()).toMatch(/^[a-z0-9]{15}$/);
});

test('newId is unique across 1000 calls', () => {
  const ids = new Set(Array.from({ length: 1000 }, newId));
  expect(ids.size).toBe(1000);
});
