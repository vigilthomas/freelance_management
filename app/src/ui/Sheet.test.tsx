import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { Sheet } from './Sheet';
import { Dialog } from './Dialog';
import { Input } from './Input';
import { Button } from './Button';

// Regression: a closed sheet must leave the DOM, otherwise its full-screen overlay silently blocks every click.
test('closed Sheet is removed from the DOM', async () => {
  const ui = (open: boolean) => (
    <StrictMode>
      <Sheet open={open} onClose={() => {}} title="Edit thing" footer={<Button>Save</Button>}>
        <Input label="Name" hint="A hint" />
      </Sheet>
    </StrictMode>
  );
  const { rerender } = render(ui(true));
  expect(await screen.findByRole('dialog', { name: 'Edit thing' })).toBeInTheDocument();
  rerender(ui(false));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), { timeout: 3000 });
  expect(document.querySelector('.fixed.inset-0')).toBeNull();
});

test('closed Dialog is removed from the DOM', async () => {
  const ui = (open: boolean) => (
    <StrictMode>
      <Dialog open={open} onClose={() => {}} title="Sure?" actions={<Button>OK</Button>}>Body</Dialog>
    </StrictMode>
  );
  const { rerender } = render(ui(true));
  expect(await screen.findByRole('alertdialog', { name: 'Sure?' })).toBeInTheDocument();
  rerender(ui(false));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(), { timeout: 3000 });
});

test('Sheet focuses the first field and keeps focus where the user is typing across re-renders', async () => {
  const ui = () => (
    <Sheet open onClose={() => {}} title="Edit thing">
      <Input label="Name" />
      <Input label="Email" />
    </Sheet>
  );
  const { rerender } = render(ui());
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Name')));
  screen.getByLabelText('Email').focus();
  rerender(ui()); // a new inline onClose, as every parent passes on each render
  await new Promise((r) => setTimeout(r, 120));
  expect(document.activeElement).toBe(screen.getByLabelText('Email'));
});
