import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

async function setup(domoMode = false) {
  const collections = new Map([
    ['Admin_Login', [{ id: 'admin', email: 'admin@qa.local', name: 'Admin', role: 'admin' }]],
    ['POD_Members', [
      { id: 'lead', email: 'lead@qa.local', name: 'Original Lead', title: 'Lead', role: 'team-lead', managerEmail: '' },
      { id: 'head', email: 'head@qa.local', name: 'Original Head', title: 'Head', role: 'team-head', managerEmail: 'lead@qa.local' },
      { id: 'member', email: 'member@qa.local', name: 'Original Member', title: 'Analyst', role: 'team-member', managerEmail: 'head@qa.local' },
      { id: 'unassigned', email: 'unassigned@qa.local', name: 'Unassigned Person', title: 'Analyst', role: 'team-member', managerEmail: '' },
    ]],
    ['POD_WorkItems', [{ id: 'task', memberEmail: 'head@qa.local', title: 'Keep this task', status: 'Complete' }]],
    ['POD_DailyUpdates', [{ id: 'log', memberEmail: 'head@qa.local', name: 'Original Head', date: '2026-10-07', todayActivity: 'Keep this history' }]],
  ]);
  const memory = new Map(Array.from(collections, ([key, value]) => ['pod-demo:' + key, JSON.stringify(value)]));
  globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k,v) => memory.set(k,v), removeItem: k => memory.delete(k) };
  localStorage.setItem('pod-demo:session', JSON.stringify({ email: 'admin@qa.local' }));
  globalThis.window = { location: { search: domoMode ? '?domoDev=1' : '', hostname: 'localhost' } };
  window.self = window; window.top = window;
  let failNextMemberSave = false;
  globalThis.memberEditDomo = {
    env: { userEmail: 'admin@qa.local', userName: 'Domo account name' },
    appdb: {
      list: async key => collections.get(key).map(({ id, ...content }) => ({ id, content })),
      update: async (key, id, document) => {
        if (failNextMemberSave && key === 'POD_Members' && id === 'head') {
          failNextMemberSave = false;
          throw new Error('Simulated AppDB save failure');
        }
        const rows = collections.get(key);
        const value = { ...document, id };
        collections.set(key, rows.map(row => row.id === id ? value : row));
        return { id, content: value };
      },
    },
  };
  let source = await readFile(new URL('../src/podStore.js', import.meta.url), 'utf8');
  source = source.replace("import Domo from 'ryuu.js';", 'const Domo = globalThis.memberEditDomo;')
    .replace("'./utils/hierarchy.js'", JSON.stringify(new URL('../src/utils/hierarchy.js', import.meta.url).href))
    .replaceAll('import.meta.env', '({ VITE_ADMIN_EMAIL: "admin@qa.local" })');
  source += '\n// Test instance ' + Math.random();
  const store = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  return { store, failMemberSave: () => { failNextMemberSave = true; } };
}

for (const domoMode of [false, true]) {
  test('profile and email edits preserve identity, reports, and history in ' + (domoMode ? 'AppDB' : 'local storage'), async () => {
    const { store } = await setup(domoMode);
    await store.updateMember('head@qa.local', { name: '  Correct Head  ', title: '  Operations Head  ' });
    let data = await store.loadWorkspace();
    let head = data.members.find(person => person.id === 'head');
    assert.equal(head.name, 'Correct Head');
    assert.equal(head.title, 'Operations Head');
    assert.equal(head.initials, 'CH');
    assert.equal(head.managerEmail, 'lead@qa.local');
    await store.updateMember('head@qa.local', { email: ' CORRECT.HEAD@qa.local ' });
    data = await store.loadWorkspace();
    head = data.members.find(person => person.id === 'head');
    assert.equal(head.email, 'correct.head@qa.local');
    assert.equal(data.members.find(person => person.id === 'member').managerEmail, head.email);
    assert.equal(data.tasks[0].memberEmail, head.email);
    assert.equal(data.tasks[0].status, 'Complete');
    assert.equal(data.dailyUpdates[0].memberEmail, head.email);
    assert.equal(data.dailyUpdates[0].todayActivity, 'Keep this history');
    await assert.rejects(store.updateMember(head.email, { email: 'lead@qa.local' }), /already exists/);
    await assert.rejects(store.updateMember(head.email, { email: 'admin@qa.local' }), /administrator/);
    await assert.rejects(store.updateMember(head.email, { name: '   ' }), /full name/);
    await assert.rejects(store.updateMember(head.email, { email: 'invalid email' }), /valid work email/);
    await store.updateMember('unassigned@qa.local', { name: 'Correct Unassigned Name' });
    if (domoMode) memberEditDomo.env.userEmail = head.email;
    else localStorage.setItem('pod-demo:session', JSON.stringify({ email: head.email }));
    assert.equal((await store.authenticateCurrentUser()).name, 'Correct Head');
    assert.equal((await store.loadWorkspace()).tasks.length, 1);
    await assert.rejects(store.updateMember(head.email, { name: 'Not allowed' }), /Only administrators/);
  });
}

test('failed AppDB email update restores changed reporting links and history', async () => {
  const { store, failMemberSave } = await setup(true);
  failMemberSave();
  await assert.rejects(store.updateMember('head@qa.local', { email: 'new.head@qa.local' }), /Simulated AppDB/);
  const data = await store.loadWorkspace();
  assert.equal(data.members.find(person => person.id === 'head').email, 'head@qa.local');
  assert.equal(data.members.find(person => person.id === 'member').managerEmail, 'head@qa.local');
  assert.equal(data.tasks[0].memberEmail, 'head@qa.local');
  assert.equal(data.dailyUpdates[0].memberEmail, 'head@qa.local');
});
