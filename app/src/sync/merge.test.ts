import { mergeDecision } from './merge';

const rec = (updated_at: number) => ({ id: 'a', updated_at, deleted: false });

test('no local → apply', () => expect(mergeDecision(undefined, rec(1), false)).toBe('apply'));
test('newer remote → apply', () => expect(mergeDecision(rec(1), rec(2), true)).toBe('apply'));
test('older remote → skip', () => expect(mergeDecision(rec(2), rec(1), false)).toBe('skip'));
test('equal and pending → skip', () => expect(mergeDecision(rec(2), rec(2), true)).toBe('skip'));
test('equal and none pending → apply', () => expect(mergeDecision(rec(2), rec(2), false)).toBe('apply'));
