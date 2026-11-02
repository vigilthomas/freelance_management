import { useEffect } from 'react';
import { APP_NAME } from '../config';

const DEFAULT_ICON = '/favicon.svg';

/** Puts the business name in the tab title and its logo in the tab icon. */
export function useDocumentBrand(name: string | undefined, logoUrl: string) {
  const title = name?.trim() || APP_NAME;
  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    const link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    link.setAttribute('href', logoUrl || DEFAULT_ICON);
    if (logoUrl) link.removeAttribute('type');
    else link.setAttribute('type', 'image/svg+xml');
  }, [logoUrl]);
}
