import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext, type AuthValue } from './AuthProvider';
import { LoginPage } from './LoginPage';

function renderWith(value: Partial<AuthValue>) {
  const full: AuthValue = { user: null, login: vi.fn(), logout: vi.fn(), ...value };
  render(
    <AuthContext.Provider value={full}>
      <LoginPage />
    </AuthContext.Provider>,
  );
  return full;
}

test('LoginPage shows error message on bad credentials', async () => {
  const value = renderWith({ login: vi.fn().mockRejectedValue(new Error('400')) });
  await userEvent.type(screen.getByLabelText(/email/i), 'me@x.test');
  await userEvent.type(screen.getByLabelText(/password/i), 'nope');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  expect(await screen.findByText('Wrong email or password')).toBeInTheDocument();
  expect(value.login).toHaveBeenCalledWith('me@x.test', 'nope');
});
