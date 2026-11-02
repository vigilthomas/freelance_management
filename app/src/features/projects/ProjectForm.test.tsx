import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetDb } from '../../data/db';
import { put } from '../../data/repo';
import type { Client, MasterRecord } from '../../data/schema';
import { ProjectForm } from './ProjectForm';

const currency = (id: string, code: string) =>
  put<MasterRecord>('currencies', { id, name: code, code, symbol: code, decimals: 2, color: '#000000', sort_order: 0, active: true, is_default: false });

beforeEach(async () => {
  await resetDb();
  await currency('cuinr0000000000', 'INR');
  await currency('cuusd0000000000', 'USD');
  await currency('cueur0000000000', 'EUR');
  await put<MasterRecord>('project_statuses', { name: 'Active', meaning: 'open', color: '#f00', sort_order: 0, active: true, is_default: true });
  await put<Client>('clients', { id: 'clientusd000000', name: 'US Co', currency: 'cuusd0000000000', archived: false });
  await put<Client>('clients', { id: 'clientinr000000', name: 'IN Co', currency: 'cuinr0000000000', archived: false });
});

async function setup() {
  render(<ProjectForm open onClose={() => {}} />);
  const client = await screen.findByLabelText('Client');
  await screen.findByRole('option', { name: 'US Co' });
  await screen.findByRole('option', { name: 'EUR' });
  return { client, currency: screen.getByLabelText('Currency') as HTMLSelectElement };
}

test('selecting client defaults currency', async () => {
  const { client, currency } = await setup();
  await userEvent.selectOptions(client, 'clientusd000000');
  await waitFor(() => expect(currency.value).toBe('cuusd0000000000'));
  await userEvent.selectOptions(client, 'clientinr000000');
  await waitFor(() => expect(currency.value).toBe('cuinr0000000000'));
});

test('manual currency not overwritten on client change', async () => {
  const { client, currency } = await setup();
  await userEvent.selectOptions(client, 'clientusd000000');
  await userEvent.selectOptions(currency, 'cueur0000000000');
  await userEvent.selectOptions(client, 'clientinr000000');
  expect(currency.value).toBe('cueur0000000000');
});
