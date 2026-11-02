import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { APP_NAME } from '../config';
import { LogoMark } from '../shell/Logo';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from './AuthProvider';

export function LoginForm({ onDone }: { onDone?: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
      onDone?.();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setError(status === 0 ? 'Can’t reach the server — check your connection' : 'Wrong email or password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && (
        <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} role="alert" className="text-[0.8125rem] font-medium text-danger">
          {error}
        </motion.p>
      )}
      <Button type="submit" loading={busy} className="mt-2 h-12" icon={!busy && <ArrowRight size={18} />}>
        Sign in
      </Button>
    </form>
  );
}

export function LoginPage() {
  return (
    <main className="grid min-h-dvh bg-paper lg:grid-cols-[1.1fr_1fr]">
      <section className="hero-mesh flex flex-col justify-between p-8 text-ink lg:m-4 lg:rounded-xl lg:p-14">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <span className="font-display text-[1.5rem] font-extrabold">{APP_NAME}</span>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
          className="mt-16 lg:mt-0"
        >
          <h1 className="max-w-xl text-[2.75rem] font-extrabold leading-[1.02] sm:text-[3.5rem]">
            Your work, clients &amp; money — forged into one place.
          </h1>
          <p className="mt-4 max-w-md text-[1rem]" style={{ color: 'color-mix(in srgb, var(--ink) 75%, transparent)' }}>
            Track projects, log every hour and send invoices from your phone or desk — even offline.
          </p>
        </motion.div>
        <p className="mt-10 hidden text-[0.8125rem] text-muted lg:block">Self-hosted · Private · Yours</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
          className="w-full max-w-sm"
        >
          <h2 className="text-[2rem] font-extrabold">Welcome back</h2>
          <p className="mb-8 mt-1 text-[0.875rem] text-muted">Sign in to pick up where you left off.</p>
          <LoginForm />
        </motion.div>
      </section>
    </main>
  );
}
