import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './Toast';

function Trigger({ onUndo }: { onUndo: () => void }) {
  const { show } = useToast();
  return <button onClick={() => show('Client deleted', { action: { label: 'Undo', onClick: onUndo } })}>go</button>;
}

test('Toast action button invokes callback', async () => {
  const onUndo = vi.fn();
  render(
    <ToastProvider>
      <Trigger onUndo={onUndo} />
    </ToastProvider>,
  );
  await userEvent.click(screen.getByText('go'));
  expect(await screen.findByText('Client deleted')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(onUndo).toHaveBeenCalledTimes(1);
});
