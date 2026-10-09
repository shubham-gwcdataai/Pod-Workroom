import assert from 'node:assert/strict';
import { test } from 'node:test';
import { directoryRows, directoryPage } from '../src/utils/directory.js';

const lead = { name: 'Maya Chen', email: 'lead@qa.local', role: 'team-lead' };
const head = { name: 'Raj Patel', email: 'head@qa.local', role: 'team-head', managerEmail: lead.email };
const members = Array.from({ length: 50 }, (_, index) => ({ name: `Member ${String(index + 1).padStart(2, '0')}`, email: `member${index + 1}@qa.local`, role: 'team-member', managerEmail: head.email }));

test('50 members paginate without duplication and search/role filters apply before pagination', () => {
    const rows = directoryRows([lead, head, ...members], []);
    const pages = Array.from({ length: 5 }, (_, index) => directoryPage(rows, { role: 'team-member', page: index + 1 }));
    assert.ok(pages.every((page) => page.rows.length === 10 && page.pageCount === 5 && page.total === 50));
    assert.equal(new Set(pages.flatMap((page) => page.rows.map((row) => row.person.email))).size, 50);
    assert.equal(directoryPage(rows, { role: 'team-member', search: 'Member 50', page: 5 }).currentPage, 1);
    assert.equal(directoryPage(rows, { role: 'team-member', search: 'Member 50' }).rows[0].person.email, 'member50@qa.local');
    assert.equal(directoryPage(rows, { role: 'team-member', search: 'Raj Patel' }).total, 50);
    assert.equal(directoryPage(rows, { role: 'team-head' }).total, 1);
    assert.equal(directoryPage(rows, { search: 'unknown' }).pageCount, 1);
});

test('reporting context survives scoped lists and workloads use normalized ownership', () => {
    const rows = directoryRows([head, ...members], [{ memberEmail: 'MEMBER1@QA.LOCAL', status: 'Complete' }, { memberEmail: members[0].email, status: 'In progress' }], lead);
    const first = rows.find((row) => row.person.email === members[0].email);
    assert.equal(first.manager.name, 'Raj Patel');
    assert.equal(first.lead.name, 'Maya Chen');
    assert.equal(first.open, 1);
    assert.equal(first.done, 1);
    assert.equal(first.completion, 50);
    assert.equal(rows[0].manager, lead);
});
