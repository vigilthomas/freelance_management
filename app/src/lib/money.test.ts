import { applyBp, formatMoney, fromMinor, roundHalfUp, toMinor } from './money';

describe('toMinor', () => {
  test.each([
    ['1,250.50', 2, 125050],
    ['1250.5', 2, 125050],
    [12, 2, 1200],
    ['1500', 0, 1500],
    ['-5', 2, -500],
    ['1.005', 2, 101],
    [' 2 000 ', 2, 200000],
  ] as const)('%s with %d decimals → %d', (input, d, expected) => {
    expect(toMinor(input, d)).toBe(expected);
  });

  test.each(['abc', '', '1.2.3', '--1'])('rejects %j', (input) => {
    expect(toMinor(input, 2)).toBeNull();
  });
});

test('fromMinor', () => {
  expect(fromMinor(125050, 2)).toBe('1250.50');
  expect(fromMinor(-500, 2)).toBe('-5.00');
  expect(fromMinor(1500, 0)).toBe('1500');
  expect(fromMinor(5, 2)).toBe('0.05');
});

test('applyBp', () => {
  expect(applyBp(10000, 1800)).toBe(1800);
  expect(applyBp(3333, 1800)).toBe(600);
});

test('roundHalfUp rounds .5 away from zero', () => {
  expect(roundHalfUp(2.5)).toBe(3);
  expect(roundHalfUp(-2.5)).toBe(-3);
});

test('formatMoney', () => {
  expect(formatMoney(125050, { code: 'INR', decimals: 2 }, 'en-IN')).toContain('1,250.50');
  expect(formatMoney(1500, { code: 'JPY', decimals: 0 }, 'en-US')).toContain('1,500');
});
