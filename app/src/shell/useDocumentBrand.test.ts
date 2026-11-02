import { renderHook } from '@testing-library/react';
import { useDocumentBrand } from './useDocumentBrand';

afterEach(() => {
  document.title = '';
  document.head.innerHTML = '';
});

test('tab title becomes the business name, falling back to the app name', () => {
  const { rerender } = renderHook(({ name }) => useDocumentBrand(name, ''), { initialProps: { name: 'Vigil Studio' } });
  expect(document.title).toBe('Vigil Studio');
  rerender({ name: '  ' });
  expect(document.title).toBe('Forge');
});

test('tab icon becomes the logo and goes back to the default favicon without one', () => {
  document.head.innerHTML = '<link rel="icon" href="/favicon.svg" type="image/svg+xml">';
  const link = () => document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')!;
  const { rerender } = renderHook(({ logo }) => useDocumentBrand('X', logo), { initialProps: { logo: 'blob:logo' } });
  expect(link().getAttribute('href')).toBe('blob:logo');
  rerender({ logo: '' });
  expect(link().getAttribute('href')).toBe('/favicon.svg');
});
