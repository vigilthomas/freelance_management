import { Link, useRouterState } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { cn } from '../ui/cn';
import { isActive, NAV } from './nav';

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      style={{ background: 'color-mix(in srgb, var(--surface) 88%, transparent)' }}
    >
      <ul className="mx-auto flex max-w-lg justify-between px-2">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = isActive(pathname, to);
          return (
            <li key={to} className="flex-1">
              <Link to={to} className="relative flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold">
                {active && (
                  <motion.span
                    layoutId="bottom-pill"
                    className="absolute top-2 h-8 w-14 rounded-full bg-accent-soft"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon size={20} className={cn('relative transition-colors duration-fast', active ? 'text-accent' : 'text-muted')} />
                <span className={cn('relative', active ? 'text-ink' : 'text-muted')}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
