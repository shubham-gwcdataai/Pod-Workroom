import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

async function loadStore(domoMode = false) {
  const collections = new Map([
    ['Admin_Login', []],
    ['POD_Members', []],
    ['POD_WorkItems', []],
    ['POD_DailyUpdates', []],
  ]);
  const memory = new Map();
  globalThis.localStorage = {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: key => memory.delete(key),
  };
  globalThis.window = { location: { search: '', hostname: 'localhost' } };
  window.self = window;
  window.top = domoMode ? {} : window;
  globalThis.demoSeedDomo = {
    env: { userEmail: 'admin@qa.local', userName: 'Test Admin' },
    appdb: {
      list: async collection => collections.get(collection).map(({ id, ...content }) => ({ id, content })),
      create: async (collection, document) => {
        const id = `${collection}-${collections.get(collection).length + 1}`;
        collections.get(collection).push({ ...document, id });
        return { id, content: document };
      },
      update: async (collection, id, document) => {
        collections.set(collection, collections.get(collection).map(record => record.id === id ? { ...document, id } : record));
        return { id, content: document };
      },
    },
  };

  let source = await readFile(new URL('../src/podStore.js', import.meta.url), 'utf8');
  source = source.replace("import('ryuu.js').then((module) => module.default)", 'Promise.resolve(globalThis.demoSeedDomo)')
    .replace("'./utils/hierarchy.js'", JSON.stringify(new URL('../src/utils/hierarchy.js', import.meta.url).href))
    .replaceAll('import.meta.env', '({ VITE_ADMIN_EMAIL: "admin@qa.local" })');
  source += `\n// ${Math.random()}`;
  const store = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  return { store, collections };
}

test('empty local storage seeds mock accounts and supports dashboard switching without duplicating data', async () => {
  const { store } = await loadStore();
  await store.initializeStore();

  let accounts = await store.listDemoUsers();
  assert.equal(accounts.length, 5);
  assert.deepEqual(accounts.map(user => user.role), ['admin', 'team-lead', 'team-head', 'team-member', 'team-member']);

  await store.switchDemoUser('ALEX.RIVERA@POD.LOCAL');
  assert.equal((await store.authenticateCurrentUser()).email, 'alex.rivera@pod.local');
  const memberWorkspace = await store.loadWorkspace();
  assert.deepEqual(memberWorkspace.members.map(member => member.email), ['alex.rivera@pod.local']);
  assert.ok(memberWorkspace.tasks.length > 0);

  const reloaded = await loadStore();
  await reloaded.store.initializeStore();
  accounts = await reloaded.store.listDemoUsers();
  assert.equal(accounts.length, 5);
  await reloaded.store.switchDemoUser('admin@qa.local');
  const adminWorkspace = await reloaded.store.loadWorkspace();
  assert.equal(adminWorkspace.members.length, 4);
  assert.equal(adminWorkspace.tasks.length, 5);
  assert.equal(adminWorkspace.dailyUpdates.length, 3);
  await assert.rejects(reloaded.store.switchDemoUser('missing@pod.local'), /does not exist/);
});

test('Domo initialization does not seed mock members, assignments, or check-ins', async () => {
  const { store, collections } = await loadStore(true);
  await store.initializeStore();

  assert.equal(collections.get('Admin_Login').length, 1);
  assert.equal(collections.get('POD_Members').length, 0);
  assert.equal(collections.get('POD_WorkItems').length, 0);
  assert.equal(collections.get('POD_DailyUpdates').length, 0);
  assert.deepEqual(await store.listDemoUsers(), []);
});

test('domoDev mode on another Vite port uses browser storage', async () => {
  let source = await readFile(new URL('../src/podStore.js', import.meta.url), 'utf8');
  const memory = new Map();
  globalThis.localStorage = {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: key => memory.delete(key),
  };
  globalThis.window = {
    location: { search: '?domoDev=1', hostname: 'localhost', port: '5173' },
  };
  window.self = window;
  window.top = window;
  source = source
    .replace("import Domo from 'ryuu.js';", 'const Domo = { env: null, appdb: null };')
    .replace("'./utils/hierarchy.js'", JSON.stringify(new URL('../src/utils/hierarchy.js', import.meta.url).href))
    .replaceAll('import.meta.env', '({ VITE_ADMIN_EMAIL: "admin@qa.local" })');
  const store = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${Math.random()}`);

  assert.equal(store.isDomoRuntime(), false);
  await store.initializeStore();
  assert.equal((await store.authenticateCurrentUser()).email, 'admin@qa.local');
});
