import assert from 'node:assert/strict';
import { test } from 'node:test';
import { localDate, weekRange, inDateRange, isOverdue } from '../src/utils/date.js';
import { summarize, filterBranch, missingCheckIns, buildNotifications } from '../src/utils/dashboard.js';

const members = [
 { email: 'lead-a@qa.local', role: 'team-lead' },
 { email: 'head-a@qa.local', role: 'team-head', managerEmail: 'lead-a@qa.local' },
 { email: 'member-a@qa.local', role: 'team-member', managerEmail: 'head-a@qa.local' },
 { email: 'lead-b@qa.local', role: 'team-lead' },
];
const today = '2026-10-07';
const tasks = [
 { id: 'overdue', memberEmail: 'member-a@qa.local', status: 'In progress', dueDate: '2026-10-06' },
 { id: 'due', memberEmail: 'head-a@qa.local', status: 'Not started', dueDate: today },
 { id: 'recent', memberEmail: 'member-a@qa.local', status: 'Complete', completedAt: '2026-10-05', dueDate: '2026-10-01' },
 { id: 'old', memberEmail: 'member-a@qa.local', status: 'Complete', completedAt: '2026-09-30' },
 { id: 'unknown', memberEmail: 'member-a@qa.local', status: 'Complete' },
 { id: 'orphan', memberEmail: 'deleted@qa.local', status: 'Not started', dueDate: '2026-10-01' },
];
const dailyUpdates = [
 { id: 'u1', memberEmail: 'member-a@qa.local', date: today, blockers: 'Awaiting access', blockerStatus: 'Not solved', escalatedTo: 'lead-a@qa.local' },
 { id: 'u2', memberEmail: 'head-a@qa.local', date: '2026-10-06', blockers: ' ', blockerStatus: 'Not solved' },
];

test('dates use local calendar dates and Monday-based weekly bounds, excluding unknown completion dates', () => {
 assert.equal(localDate(new Date(2026, 9, 7, 0, 30)), today);
 assert.deepEqual(weekRange(new Date(2026, 9, 7)), { from: '2026-10-05', to: today });
 assert.deepEqual(weekRange(new Date(2026, 9, 4)), { from: '2026-09-28', to: '2026-10-04' });
 assert.equal(inDateRange(undefined, '2026-10-05', today), false);
 assert.equal(inDateRange(undefined), true);
 assert.equal(isOverdue(tasks[0], today), true);
 assert.equal(isOverdue(tasks[1], today), false);
 assert.equal(isOverdue(tasks[2], today), false);
});

test('summary and branch filters count only matching team data and retain orphan work in admin totals', () => {
 const selected = filterBranch(members, 'lead-a@qa.local');
 assert.equal(selected.length, 3);
 assert.equal(filterBranch(members, 'lead-b@qa.local', 'head-a@qa.local').length, 0);
 const summary = summarize(selected, tasks, dailyUpdates, { from: '2026-10-05', to: today }, today);
 assert.equal(summary.open, 2); assert.equal(summary.overdue, 1); assert.equal(summary.complete, 1); assert.equal(summary.blockers, 1); assert.equal(summary.missing, 2);
 assert.equal(summarize(members, tasks, dailyUpdates, {}, today, true).open, 3);
 assert.equal(missingCheckIns(members, dailyUpdates, today).length, 3);
});

test('notifications link to real overdue, escalated, and missing check-in data', () => {
 const scoped = { members: filterBranch(members, 'lead-a@qa.local'), tasks: tasks.slice(0,5), dailyUpdates };
 const alerts = buildNotifications(scoped, members[0], today);
 assert.equal(alerts.find(alert => alert.id === 'overdue').filters.overdue, true);
 assert.equal(alerts.find(alert => alert.id === 'escalated').view, 'updates');
 assert.equal(alerts.find(alert => alert.id === 'missing').filters.date, today);
 const memberAlerts = buildNotifications({ members: [members[2]], tasks: tasks.filter(task => task.memberEmail === members[2].email), dailyUpdates: dailyUpdates.slice(0,1) }, members[2], today);
 assert.equal(memberAlerts.some(alert => alert.id === 'missing'), false);
 assert.equal(memberAlerts.find(alert => alert.id === 'overdue').view, 'my-work');
});
