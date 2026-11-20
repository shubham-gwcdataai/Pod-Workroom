import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

async function setup({ users = [], domoMode = true, hostname = domoMode ? 'localhost' : 'pod.example' } = {}) {
  const requests = [];
  globalThis.window = {
    location: {
      search: domoMode ? '?domoDev=1' : '',
      hostname,
    },
  };
  window.self = window;
  window.top = window;
  globalThis.domoUserSearchDomo = {
    env: { userEmail: 'admin@qa.local' },
    get: async url => {
      requests.push(url);
      const { searchParams } = new URL(url, 'http://localhost');
      const offset = Number(searchParams.get('offset'));
      const limit = Number(searchParams.get('limit'));
      return users.slice(offset, offset + limit);
    },
  };

  let source = await readFile(new URL('../src/podStore.js', import.meta.url), 'utf8');
  source = source.replace("import('ryuu.js').then((module) => module.default)", 'Promise.resolve(globalThis.domoUserSearchDomo)')
    .replace("'./utils/hierarchy.js'", JSON.stringify(new URL('../src/utils/hierarchy.js', import.meta.url).href))
    .replaceAll('import.meta.env', '({ VITE_ADMIN_EMAIL: "admin@qa.local" })');
  const store = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${Math.random()}`);
  return { store, requests };
}

test('searches all pages of the Domo user directory and reuses the loaded directory', async () => {
  const users = Array.from({ length: 105 }, (_, index) => ({
    id: index,
    displayName: `Employee ${index}`,
    detail: { email: `employee${index}@example.com`, title: 'Analyst' },
  }));
  users[102] = {
    id: 102,
    displayName: 'Balaji Krishnan',
    detail: { email: 'balaji.krishnan@gwcdata.ai', title: 'Engineer' },
  };
  const { store, requests } = await setup({ users });

  assert.equal(store.canSearchDomoUsers(), true);
  assert.deepEqual(await store.searchDomoUsers('balaji'), [{
    email: 'balaji.krishnan@gwcdata.ai',
    name: 'Balaji Krishnan',
    title: 'Engineer',
  }]);
  assert.equal(requests.length, 2);
  assert.match(requests[0], /offset=0$/);
  assert.match(requests[0], /limit=100/);
  assert.match(requests[1], /offset=100$/);
  assert.equal((await store.searchDomoUsers('GWCData.ai')).length, 1);
  assert.equal(requests.length, 2);
});

test('requires a Domo connection before searching the company directory', async () => {
  const { store, requests } = await setup({ domoMode: false });

  assert.equal(store.canSearchDomoUsers(), false);
  await assert.rejects(store.searchDomoUsers('someone'), /Connect to Domo/);
  assert.equal(requests.length, 0);
});

test('allows company-user lookup on localhost while keeping the store in local mode', async () => {
  const { store, requests } = await setup({ domoMode: false, hostname: 'localhost' });

  assert.equal(store.canSearchDomoUsers(), true);
  assert.equal(store.isDomoRuntime(), false);
  assert.equal((await store.searchDomoUsers('employee')).length, 0);
  assert.equal(requests.length, 1);
});

test('domoapi helper fetches every page from the authenticated user endpoint', async () => {
  const requests = [];
  const users = Array.from({ length: 105 }, (_, index) => ({ id: index }));
  const domo = {
    get: async url => {
      requests.push(url);
      const { searchParams } = new URL(url, 'http://localhost');
      const offset = Number(searchParams.get('offset'));
      const limit = Number(searchParams.get('limit'));
      return users.slice(offset, offset + limit);
    },
  };
  const helperSource = await readFile(new URL('../src/domoapi.js', import.meta.url), 'utf8');
  const context = { window: { domo }, Promise, Date, URL };
  runInNewContext(helperSource, context);

  const fetchedUsers = await context.window.domoApi.getUsers(domo, 100);
  assert.equal(fetchedUsers.length, 105);
  assert.equal(requests.length, 2);
  assert.match(requests[0], /includeDetails=true&limit=100&offset=0$/);
  assert.match(requests[1], /includeDetails=true&limit=100&offset=100$/);
});
