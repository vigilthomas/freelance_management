import { Link, useRouterState } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../ui/cn';
import { useTheme } from '../ui/theme';
import { Logo } from './Logo';
import { isActive, NAV } from './nav';
import { SyncIndicator } from './SyncIndicator';

const KEY = 'forge-sidebar';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function Sidebar({ onSignInAgain }: { onSignInAgain(): void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const { mode, setMode } = useTheme();
  const dark = mode === 'dark' || (mode === 'system' && document.documentElement.classList.contains('dark'));

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(KEY, c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-paper px-3 py-5 lg:flex',
        collapsed ? 'w-[76px]' : 'w-[248px]',
      )}
    >
      <div className={cn('mb-8 flex items-center px-2', collapsed ? 'justify-center' : 'justify-between')}>
        <Logo collapsed={collapsed} />
        {!collapsed && (
          <button onClick={toggle} aria-label="Collapse sidebar" className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = isActive(pathname, to);
          return (
            <Link
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={cn(
                'relative flex h-11 items-center gap-3 rounded-md px-3 text-[0.875rem] font-medium transition-colors duration-fast',
                active ? 'text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink',
                collapsed && 'justify-center px-0',
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-pill"
                  className="absolute inset-0 rounded-md border border-line bg-surface shadow-1"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon size={19} className={cn('relative', active && 'text-accent')} />
              {!collapsed && <span className="relative">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn('flex flex-col gap-3 px-1', collapsed && 'items-center')}>
        <SyncIndicator onSignInAgain={onSignInAgain} compact={collapsed} />
        <div className={cn('flex items-center gap-1', collapsed && 'flex-col')}>
          <button
            onClick={() => setMode(dark ? 'light' : 'dark')}
            aria-label="Toggle dark mode"
            className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-ink"
          >
            <motion.span key={dark ? 'm' : 's'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} className="block">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </motion.span>
          </button>
          {collapsed && (
            <button onClick={toggle} aria-label="Expand sidebar" className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-ink">
              <PanelLeftOpen size={18} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
