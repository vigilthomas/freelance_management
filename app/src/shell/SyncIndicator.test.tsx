import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setSyncState } from '../sync/status';
import { SyncIndicator } from './SyncIndicator';

test('SyncIndicator shows "3 pending" when offline with pending 3', () => {
  act(() => setSyncState({ state: 'offline', pending: 3 }, true));
  render(<SyncIndicator onSignInAgain={() => {}} />);
  expect(screen.getByText(/3 pending/)).toBeInTheDocument();
  expect(screen.getByText(/offline/i)).toBeInTheDocument();
});

test('SyncIndicator shows "Sign in again" button when authExpired', async () => {
  act(() => setSyncState({ state: 'error', pending: 1, authExpired: true }, true));
  const onSignInAgain = vi.fn();
  render(<SyncIndicator onSignInAgain={onSignInAgain} />);
  await userEvent.click(screen.getByRole('button', { name: /sync status/i }));
  await userEvent.click(await screen.findByRole('button', { name: 'Sign in again' }));
  expect(onSignInAgain).toHaveBeenCalled();
});
