import { db, resetDb } from '../../data/db';
import { put } from '../../data/repo';
import type { MasterRecord, Project } from '../../data/schema';
import { isMasterInUse, removeMaster, reorder, setDefault } from './actions';

const master = (over: Partial<MasterRecord>) =>
  put<MasterRecord>('project_statuses', { name: 'S', color: '#000000', sort_order: 0, active: true, is_default: false, ...over });

beforeEach(async () => {
  await resetDb();
});

test('isMasterInUse true when a project references the status', async () => {
  const s = await master({ name: 'Active' });
  expect(await isMasterInUse('project_statuses', s.id)).toBe(false);
  await put<Project>('projects', { name: 'P', status: s.id, tags: [] });
  expect(await isMasterInUse('project_statuses', s.id)).toBe(true);
});

test('isMasterInUse checks array references (tags)', async () => {
  const tag = await put<MasterRecord>('tags', { name: 'urgent', color: '#f00', sort_order: 0, active: true, is_default: false });
  await put<Project>('projects', { name: 'P', status: '', tags: ['x', tag.id] });
  expect(await isMasterInUse('tags', tag.id)).toBe(true);
});

test('isMasterInUse ignores soft-deleted referencing records', async () => {
  const s = await master({ name: 'Active' });
  await put<Project>('projects', { name: 'P', status: s.id, tags: [], deleted: true });
  expect(await isMasterInUse('project_statuses', s.id)).toBe(false);
});

test('removeMaster returns in_use and leaves row untouched', async () => {
  const s = await master({ name: 'Active' });
  await put<Project>('projects', { name: 'P', status: s.id, tags: [] });
  expect(await removeMaster('project_statuses', s.id)).toBe('in_use');
  expect((await db.coll<MasterRecord>('project_statuses').get(s.id))?.deleted).toBe(false);
});

test('removeMaster soft-deletes an unused value', async () => {
  const s = await master({ name: 'Unused' });
  expect(await removeMaster('project_statuses', s.id)).toBe('deleted');
  expect((await db.coll<MasterRecord>('project_statuses').get(s.id))?.deleted).toBe(true);
});

test('setDefault leaves exactly one default', async () => {
  const a = await master({ name: 'A', is_default: true });
  const b = await master({ name: 'B' });
  await setDefault('project_statuses', b.id);
  const rows = await db.coll<MasterRecord>('project_statuses').toArray();
  expect(rows.filter((r) => r.is_default).map((r) => r.id)).toEqual([b.id]);
  expect(rows.find((r) => r.id === a.id)?.is_default).toBe(false);
});

test('reorder writes sort_order 0,10,20', async () => {
  const a = await master({ name: 'A', sort_order: 0 });
  const b = await master({ name: 'B', sort_order: 10 });
  const c = await master({ name: 'C', sort_order: 20 });
  await reorder('project_statuses', [c.id, a.id, b.id]);
  const t = db.coll<MasterRecord>('project_statuses');
  expect((await t.get(c.id))?.sort_order).toBe(0);
  expect((await t.get(a.id))?.sort_order).toBe(10);
  expect((await t.get(b.id))?.sort_order).toBe(20);
});
