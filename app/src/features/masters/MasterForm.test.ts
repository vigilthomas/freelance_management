import { componentsToDrafts, draftsToComponents } from './TaxComponentsEditor';
import { validateMaster } from './MasterForm';

const d = (name: string, percent: string) => ({ key: name + percent, name, percent });

test('draftsToComponents converts percent to basis points', () => {
  expect(draftsToComponents([d('CGST', '9'), d('SGST', '9')])).toEqual([
    { name: 'CGST', rate: 900 },
    { name: 'SGST', rate: 900 },
  ]);
  expect(draftsToComponents([d('VAT', '20.5')])).toEqual([{ name: 'VAT', rate: 2050 }]);
});

test('draftsToComponents rejects bad rows', () => {
  expect(draftsToComponents([d('', '9')])).toBeNull();
  expect(draftsToComponents([d('X', 'abc')])).toBeNull();
  expect(draftsToComponents([d('X', '101')])).toBeNull();
  expect(draftsToComponents([d('X', '-1')])).toBeNull();
});

test('componentsToDrafts round-trips', () => {
  const drafts = componentsToDrafts([{ name: 'IGST', rate: 1800 }, { name: 'Cess', rate: 125 }]);
  expect(drafts.map((x) => x.percent)).toEqual(['18', '1.25']);
  expect(draftsToComponents(drafts)).toEqual([{ name: 'IGST', rate: 1800 }, { name: 'Cess', rate: 125 }]);
});

const base = {
  name: 'X', color: '#000000', active: true, is_default: false, meaning: 'open', level: '1', label: '',
  days: '0', code: 'INR', symbol: '₹', decimals: '2', components: [],
};

test('validateMaster checks currency code and decimals', () => {
  expect(validateMaster('currencies', base)).toEqual({});
  expect(validateMaster('currencies', { ...base, code: 'rs' }).code).toBeDefined();
  expect(validateMaster('currencies', { ...base, decimals: '7' }).decimals).toBeDefined();
});

test('validateMaster requires a name everywhere', () => {
  expect(validateMaster('tags', { ...base, name: '  ' }).name).toBe('Name is required');
});
