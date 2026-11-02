import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { startSync } from '../sync/engine';
import { createPbTransport } from '../sync/transport';
import { logout } from './logout';
import { pb } from './pb';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthValue {
  user: AuthUser | null;
  login(email: string, password: string): Promise<void>;
  logout(opts?: { force?: boolean }): Promise<'done' | 'pending'>;
}

export const AuthContext = createContext<AuthValue | null>(null);

function currentUser(): AuthUser | null {
  const r = pb.authStore.record;
  // An expired token still identifies the owner: keep working offline and ask to sign in again on sync.
  return pb.authStore.token && r ? { id: r.id, email: String(r.email ?? '') } : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(currentUser);

  useEffect(() => pb.authStore.onChange(() => setUser(currentUser())), []);

  useEffect(() => {
    if (!user) return;
    // The transport checks the session itself (a refresh on the first cycle, then every few minutes).
    const stop = startSync(createPbTransport(pb));
    return () => void stop();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<AuthValue>(
    () => ({
      user,
      async login(email, password) {
        await pb.collection('users').authWithPassword(email, password);
      },
      logout,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
