import { outputSize, pickLogoSource, rotatedBounds } from './logo';

const file = (name: string) => ({ name, type: 'image/png', data: new ArrayBuffer(4) });

test('outputSize keeps the crop size when it is small enough', () => {
  expect(outputSize({ width: 400, height: 200 }, 1024)).toEqual({ width: 400, height: 200 });
});

test('outputSize scales the longest side down to the cap, keeping the ratio', () => {
  expect(outputSize({ width: 3000, height: 1000 }, 1024)).toEqual({ width: 1024, height: 341 });
  expect(outputSize({ width: 500, height: 2048 }, 1024)).toEqual({ width: 250, height: 1024 });
});

test('rotatedBounds swaps sides at 90° and keeps them at 180°', () => {
  expect(rotatedBounds(300, 100, 90)).toEqual({ width: 100, height: 300 });
  expect(rotatedBounds(300, 100, 180)).toEqual({ width: 300, height: 100 });
});

test('a logo picked but not yet synced wins over the cached server copy', () => {
  expect(pickLogoSource('a.png', file('new.png'), { name: 'a.png', type: 'image/png', data: new ArrayBuffer(1) })).toEqual({ kind: 'pending', file: file('new.png') });
});

test('a pending removal shows no logo', () => {
  expect(pickLogoSource('a.png', null, undefined)).toEqual({ kind: 'none' });
});

test('the cache is used only when it holds the current server file', () => {
  const cache = { name: 'a.png', type: 'image/png', data: new ArrayBuffer(1) };
  expect(pickLogoSource('a.png', undefined, cache)).toEqual({ kind: 'cached', file: cache });
  expect(pickLogoSource('b.png', undefined, cache)).toEqual({ kind: 'fetch', name: 'b.png' });
  expect(pickLogoSource('', undefined, cache)).toEqual({ kind: 'none' });
});
