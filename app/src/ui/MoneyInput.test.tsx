import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MoneyInput } from './MoneyInput';

function Harness({ onChange, initial = null, decimals = 2 }: { onChange(v: number | null): void; initial?: number | null; decimals?: number }) {
  const [v, setV] = useState<number | null>(initial);
  return (
    <MoneyInput
      label="Rate"
      value={v}
      decimals={decimals}
      symbol="₹"
      onChange={(x) => {
        setV(x);
        onChange(x);
      }}
    />
  );
}

test('MoneyInput parses "1,250.50" to 125050', async () => {
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  await userEvent.type(screen.getByLabelText('Rate'), '1,250.50');
  expect(onChange).toHaveBeenLastCalledWith(125050);
});

test('client form rejects -5 rate: shows "Must be 0 or more" and reports null', async () => {
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  await userEvent.type(screen.getByLabelText('Rate'), '-5');
  expect(onChange).toHaveBeenLastCalledWith(null);
  expect(screen.getByText('Must be 0 or more')).toBeInTheDocument();
});

test('MoneyInput shows the stored value and rejects text', async () => {
  const onChange = vi.fn();
  render(<Harness onChange={onChange} initial={150000} />);
  const input = screen.getByLabelText('Rate') as HTMLInputElement;
  expect(input.value).toBe('1500.00');
  await userEvent.clear(input);
  await userEvent.type(input, 'abc');
  expect(onChange).toHaveBeenLastCalledWith(null);
  expect(screen.getByText('Enter an amount like 1500 or 1,250.50')).toBeInTheDocument();
});

test('empty input is allowed and reports null without an error', async () => {
  const onChange = vi.fn();
  render(<Harness onChange={onChange} initial={100} />);
  await userEvent.clear(screen.getByLabelText('Rate'));
  expect(onChange).toHaveBeenLastCalledWith(null);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
