import { render, screen } from '@testing-library/react';
import App from './App';
import { APP_NAME } from './config';

test('signed-out visitors see the login screen with the app name', async () => {
  render(<App />);
  expect((await screen.findAllByText(APP_NAME)).length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
});
