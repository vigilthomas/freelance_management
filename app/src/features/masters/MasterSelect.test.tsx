import { render, screen, within } from '@testing-library/react';
import { resetDb } from '../../data/db';
import { put } from '../../data/repo';
import type { MasterRecord } from '../../data/schema';
import { MasterSelect } from './MasterSelect';

const row = (name: string, over: Partial<MasterRecord> = {}) =>
  put<MasterRecord>('project_statuses', { name, color: '#000000', sort_order: 0, active: true, is_default: false, ...over });

beforeEach(async () => {
  await resetDb();
});

test('MasterSelect hides inactive but shows current', async () => {
  const lead = await row('Lead', { active: false, sort_order: 0 });
  await row('Active', { sort_order: 10 });
  await row('Archived', { active: false, sort_order: 20 });

  render(<MasterSelect kind="project_statuses" label="Status" value={lead.id} onChange={() => {}} />);
  const select = await screen.findByLabelText('Status');
  await screen.findByRole('option', { name: 'Lead (inactive)' });
  const names = within(select).getAllByRole('option').map((o) => o.textContent);
  expect(names).toEqual(['Lead (inactive)', 'Active']);
});

test('MasterSelect for a new record lists only active values in sort order', async () => {
  await row('Second', { sort_order: 10 });
  await row('First', { sort_order: 0 });
  await row('Hidden', { active: false });
  render(<MasterSelect kind="project_statuses" label="Status" value="" onChange={() => {}} placeholder="Choose…" />);
  await screen.findByRole('option', { name: 'First' });
  const names = within(screen.getByLabelText('Status')).getAllByRole('option').map((o) => o.textContent);
  expect(names).toEqual(['Choose…', 'First', 'Second']);
});
