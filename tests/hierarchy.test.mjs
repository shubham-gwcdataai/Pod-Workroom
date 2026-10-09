import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { scopeWorkspace, validateHierarchy } from '../src/utils/hierarchy.js';

const people = [
  { email: 'lead-a@qa.local', role: 'team-lead', name: 'Lead A' },
  { email: 'lead-b@qa.local', role: 'team-lead', name: 'Lead B' },
  { email: 'head-a@qa.local', role: 'team-head', managerEmail: 'LEAD-A@qa.local', name: 'Head A' },
  { email: 'head-b@qa.local', role: 'team-head', managerEmail: 'lead-b@qa.local', name: 'Head B' },
  { email: 'member-a@qa.local', role: 'team-member', managerEmail: 'head-a@qa.local', name: 'Member A' },
  { email: 'member-b@qa.local', role: 'team-member', managerEmail: 'head-b@qa.local', name: 'Member B' },
  { email: 'legacy@qa.local', role: 'team-lead', managerEmail: 'head-a@qa.local', name: 'Legacy lead' },
];
const workspace = { members: people, tasks: people.map((p, id) => ({ id: String(id), memberEmail: p.email, status: 'Not started' })), dailyUpdates: people.map((p, id) => ({ id: String(id), memberEmail: p.email, date: '2026-10-06' })) };

test('admin sees all branches, lead sees own heads and their members, head and member stay scoped', () => {
  assert.equal(scopeWorkspace(workspace, { role: 'admin' }).members.length, 7);
  for (const [index, expected] of [[0, [0, 2, 4]], [2, [2, 4]], [4, [4]]]) {
    const scoped = scopeWorkspace(workspace, people[index]);
    assert.deepEqual(scoped.members.map(p => p.email), expected.map(i => people[i].email));
    assert.deepEqual(scoped.tasks.map(t => t.memberEmail), expected.map(i => people[i].email));
    assert.deepEqual(scoped.dailyUpdates.map(t => t.memberEmail), expected.map(i => people[i].email));
  }
  assert.deepEqual(scopeWorkspace(workspace, null), { members: [], tasks: [], dailyUpdates: [] });
});

test('hierarchy rejects self assignment, missing managers, and reversed roles', () => {
  validateHierarchy(people[2], people);
  validateHierarchy(people[4], people);
  assert.throws(() => validateHierarchy({ ...people[2], managerEmail: people[4].email }, people));
  assert.throws(() => validateHierarchy({ ...people[4], managerEmail: people[0].email }, people));
  assert.throws(() => validateHierarchy({ ...people[2], managerEmail: people[2].email }, people));
  assert.throws(() => validateHierarchy({ ...people[2], managerEmail: '' }, people));
});

test('store keeps existing workflows and history while enforcing assignment and deletion access', async () => {
  const memory = new Map();
  globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k,v) => memory.set(k,v), removeItem: k => memory.delete(k) };
  globalThis.window = { location: { search: '', hostname: 'localhost' } };
  window.self = window; window.top = window;
  let source = await readFile(new URL('../src/podStore.js', import.meta.url), 'utf8');
  source = source.replace("import Domo from 'ryuu.js';", 'const Domo = {};')
    .replace("'./utils/hierarchy.js'", JSON.stringify(pathToFileURL(new URL('../src/utils/hierarchy.js', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')).href))
    .replace("'./utils/date.js'", JSON.stringify(new URL('../src/utils/date.js', import.meta.url).href))
    .replaceAll('import.meta.env', '({ VITE_ADMIN_EMAIL: "admin@qa.local" })');
  const store = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  await store.initializeStore();
  const session = email => localStorage.setItem('pod-demo:session', JSON.stringify({ email, role: 'admin' }));
  session('admin@qa.local');
  for (const person of people.slice(0, 6)) await store.createMember(person);
  await assert.rejects(store.createMember({ ...people[0], email: people[0].email.toUpperCase() }), /already exists/);
  await assert.rejects(store.createMember({ ...people[4], email: 'invalid@qa.local', managerEmail: people[0].email }));
  await store.createTask({ id: 'ignored', title: 'Existing work', memberEmail: people[4].email, status: 'Not started' });
  session(people[4].email);
  let data = await store.loadWorkspace();
  await store.updateTask(data.tasks[0].id, { status: 'Complete' });
  await store.saveDailyUpdate({ memberEmail: people[4].email, name: 'Member A', date: '2026-10-06', todayActivity: 'Done' });
  await store.saveDailyUpdate({ memberEmail: people[4].email, name: 'Member A', date: '2026-10-06', todayActivity: 'Updated' });
  await assert.rejects(store.deleteMember(people[3].email), /Only administrators/);
  await assert.rejects(store.createTask({}), /Only administrators/);
  await assert.rejects(store.saveDailyUpdate({ memberEmail: people[5].email }));
  session('admin@qa.local');
  await assert.rejects(store.updateMember(people[2].email, { role: 'team-lead' }), /Reassign/);
  await store.updateMember(people[2].email, { role: 'team-head', managerEmail: people[1].email });
  session(people[0].email);
  assert.deepEqual((await store.loadWorkspace()).members.map(p => p.email), [people[0].email]);
  session('admin@qa.local');
  await store.deleteMember(people[2].email);
  data = await store.loadWorkspace();
  assert.equal(data.members.find(p => p.email === people[4].email).managerEmail, '');
  assert.equal(data.tasks[0].status, 'Complete');
  assert.equal(data.dailyUpdates.length, 1);
  assert.equal(data.dailyUpdates[0].todayActivity, 'Updated');
  await store.deleteMember(people[4].email);
  session(people[4].email);
  assert.equal(await store.authenticateCurrentUser(), null);
  assert.equal((await store.loadWorkspace()).tasks.length, 0);
  session('admin@qa.local');
  assert.equal((await store.loadWorkspace()).tasks.length, 1);
});
