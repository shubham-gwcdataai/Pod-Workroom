import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

let source = await readFile(new URL('../src/services/userDirectory.js', import.meta.url), 'utf8');
source = source.replace("import Domo from 'ryuu.js';", 'const Domo = {};')
    .replace("import { authenticateCurrentUser, isDomoRuntime } from '../podStore';", 'const authenticateCurrentUser = async () => null; const isDomoRuntime = () => false;')
    .replace("'../utils/hierarchy.js'", JSON.stringify(new URL('../src/utils/hierarchy.js', import.meta.url).href));
const { createUserDirectory, normalizeDomoUser } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const admin = async () => ({ role: 'admin', email: 'admin@qa.local' });

test('Domo detail.email and emailAddress are recognized without using alternate email', () => {
    assert.equal(normalizeDomoUser({ id: 1, displayName: 'Shubham Maji', detail: { email: 'Shubham.Maji@gwcdata.ai' } }).email, 'shubham.maji@gwcdata.ai');
    assert.equal(normalizeDomoUser({ emailAddress: 'Biplab.Mondal@gwcdata.ai' }).email, 'biplab.mondal@gwcdata.ai');
    assert.equal(normalizeDomoUser({ email: 'primary@qa.local', detail: { email: 'other@qa.local' }, alternateEmail: 'alternate@qa.local' }).email, 'primary@qa.local');
    assert.equal(normalizeDomoUser({ alternateEmail: 'alternate@qa.local' }).email, '');
});

test('list and detail lookups both handle nested Domo primary email', async () => {
    const directory = createUserDirectory({ authorize: admin, available: () => true, get: async (url) => url.includes('/42?')
        ? { data: { id: 42, displayName: 'Shubham Maji', detail: { email: 'shubham.maji@gwcdata.ai', title: 'Manager' } } }
        : [{ id: 42, displayName: 'Shubham Maji' }] });
    const matches = await directory.search('Shubham');
    const person = await directory.details(matches[0]);
    assert.equal(person.email, 'shubham.maji@gwcdata.ai');
    assert.equal(person.title, 'Manager');
});

test('Domo name search searches past 500 users, caches pages, and returns the primary email', async () => {
    const people = Array.from({ length: 501 }, (_, index) => ({ id: index + 1, displayName: index === 500 ? 'Biplab Mondal' : `Person ${index}`, email: index === 500 ? 'Biplab.Mondal@gwcdata.ai' : `person${index}@qa.local`, alternateEmail: 'ignore@qa.local' }));
    const calls = [];
    const directory = createUserDirectory({ authorize: admin, available: () => true, get: async (url) => { calls.push(url); const params = new URL(url, 'https://qa.local').searchParams; assert.equal(params.get('includeDetails'), 'true'); return people.slice(Number(params.get('offset')), Number(params.get('offset')) + Number(params.get('limit'))); } });
    const results = await directory.search('Biplab Mondal');
    assert.equal(results.length, 1);
    assert.equal(results[0].email, 'biplab.mondal@gwcdata.ai');
    assert.equal(calls.length, 6);
    assert.equal((await directory.search('biplab.mondal')).length, 1);
    assert.equal(calls.length, 6);
});

test('missing list email is fetched from the supplied GetUser endpoint and missing emails are not invented', async () => {
    const paths = [];
    const directory = createUserDirectory({ authorize: admin, available: () => true, get: async (url) => { paths.push(url); return { userId: 42, displayName: 'Biplab Mondal', email: 'biplab.mondal@gwcdata.ai', title: 'Team manager' }; } });
    const profile = await directory.details({ id: 42, name: 'Biplab Mondal', email: '', title: '' });
    assert.equal(paths[0], '/domo/users/v1/42?includeDetails=true');
    assert.equal(profile.title, 'Team manager');
    assert.equal(profile.email, 'biplab.mondal@gwcdata.ai');
    await assert.rejects(directory.details({ name: 'Missing email', email: '' }), /Enter their company email manually/);
});

test('directory reads require Admin, errors can be retried, and repeated server pages cannot loop forever', async () => {
    let role = 'team-member', calls = 0, denied = true;
    const directory = createUserDirectory({ authorize: async () => ({ role, email: 'admin@qa.local' }), available: () => true, get: async () => { calls++; if (denied) throw Object.assign(new Error('Forbidden'), { status: 403 }); return [{ id: 1, name: 'Biplab', email: 'biplab@gwcdata.ai' }]; } });
    await assert.rejects(directory.search('Biplab'), /Only administrators/);
    assert.equal(calls, 0);
    role = 'admin'; await assert.rejects(directory.search('Biplab'), /denied access/);
    denied = false; assert.equal((await directory.search('Biplab')).length, 1);
    role = 'team-head'; await assert.rejects(directory.search('Biplab'), /Only administrators/);
    const repeated = createUserDirectory({ authorize: admin, available: () => true, get: async () => Array.from({ length: 100 }, (_, id) => ({ id, name: `User ${id}` })) });
    await assert.rejects(repeated.search('User'), /Could not load/);
});
