import { useState, type FormEvent } from 'react';
import { APP_NAME } from '../config';
import { useAuth } from './AuthProvider';

export function LoginPage() {
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
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setError(status === 0 ? 'Can’t reach the server — check your connection' : 'Wrong email or password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>{APP_NAME}</h1>
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy}>
          Sign in
        </button>
      </form>
    </main>
  );
}
