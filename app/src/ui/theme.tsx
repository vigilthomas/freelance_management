import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRow } from '../data/hooks';
import { SETTINGS_ID, type Settings } from '../data/schema';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeValue {
  mode: ThemeMode;
  setMode(m: ThemeMode): void;
}

const ThemeContext = createContext<ThemeValue>({ mode: 'system', setMode: () => {} });
const KEY = 'forge-theme';

function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const settings = useRow<Settings>('settings', SETTINGS_ID);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && !!mq?.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    mq?.addEventListener?.('change', apply);
    return () => mq?.removeEventListener?.('change', apply);
  }, [mode]);

  useEffect(() => {
    const accent = settings?.accent_color;
    if (accent && /^#[0-9a-f]{6}$/i.test(accent)) {
      document.documentElement.style.setProperty('--accent', accent);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accent);
    }
  }, [settings?.accent_color]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* storage unavailable: keep in memory */
    }
  };

  return <ThemeContext.Provider value={{ mode, setMode }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
