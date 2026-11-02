import { useRouterState } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { LoginForm } from '../auth/LoginPage';
import { requestSync } from '../sync/engine';
import { Dialog } from '../ui/Dialog';
import { pageVariants } from '../ui/motion';
import { BottomNav } from './BottomNav';
import { Logo } from './Logo';
import { Sidebar } from './Sidebar';
import { SyncIndicator } from './SyncIndicator';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [reauth, setReauth] = useState(false);
  const openReauth = () => setReauth(true);

  return (
    <div className="flex min-h-dvh bg-paper">
      <Sidebar onSignInAgain={openReauth} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line px-4 py-3 backdrop-blur-xl lg:hidden"
          style={{ background: 'color-mix(in srgb, var(--paper) 85%, transparent)' }}>
          <Logo />
          <SyncIndicator onSignInAgain={openReauth} />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          <motion.div key={pathname} variants={pageVariants} initial="initial" animate="animate">
            {children}
          </motion.div>
        </main>
      </div>
      <BottomNav />
      <Dialog open={reauth} onClose={() => setReauth(false)} title="Sign in again">
        <p className="mb-4">Your session expired. Your unsynced changes are safe on this device.</p>
        <LoginForm
          onDone={() => {
            setReauth(false);
            requestSync();
          }}
        />
      </Dialog>
    </div>
  );
}
