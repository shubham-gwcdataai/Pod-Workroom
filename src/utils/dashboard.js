import { emailKey, visibleMembers } from './hierarchy.js';
import { inDateRange, isOverdue, localDate, weekRange } from './date.js';

export function branchEmails(members, email) {
    const root = members.find((person) => emailKey(person.email) === emailKey(email));
    return new Set(root ? visibleMembers(members, root).map((person) => emailKey(person.email)) : []);
}

export function filterBranch(members, leadEmail = '', headEmail = '') {
    let result = members;
    for (const email of [leadEmail, headEmail].filter(Boolean)) {
        const emails = branchEmails(members, email);
        result = result.filter((person) => emails.has(emailKey(person.email)));
    }
    return result;
}

export const hasOpenBlocker = (update) => update.blockerStatus === 'Not solved' && Boolean(update.blockers?.trim());

export function missingCheckIns(members, updates, date = localDate()) {
    const logged = new Set(updates.filter((update) => update.date === date).map((update) => emailKey(update.memberEmail)));
    return members.filter((person) => !logged.has(emailKey(person.email)));
}

export function summarize(members, tasks, updates, range = weekRange(), today = localDate(), includeAllRecords = false) {
    const emails = new Set(members.map((person) => emailKey(person.email)));
    const ownedTasks = includeAllRecords ? tasks : tasks.filter((task) => emails.has(emailKey(task.memberEmail)));
    const logs = includeAllRecords ? updates : updates.filter((update) => emails.has(emailKey(update.memberEmail)));
    return {
        open: ownedTasks.filter((task) => task.status !== 'Complete').length,
        overdue: ownedTasks.filter((task) => isOverdue(task, today)).length,
        complete: ownedTasks.filter((task) => task.status === 'Complete' && inDateRange(task.completedAt, range.from, range.to)).length,
        blockers: logs.filter(hasOpenBlocker).length,
        missing: missingCheckIns(members, logs, today).length,
        heads: members.filter((person) => person.role === 'team-head').length,
        members: members.filter((person) => person.role === 'team-member').length,
    };
}

export function buildNotifications(workspace, user, today = localDate()) {
    if (!user) return [];
    const manager = ['admin', 'team-lead', 'team-head'].includes(user.role);
    const tasks = manager ? workspace.tasks : workspace.tasks.filter((task) => emailKey(task.memberEmail) === emailKey(user.email));
    const overdue = tasks.filter((task) => isOverdue(task, today));
    const due = tasks.filter((task) => task.status !== 'Complete' && task.dueDate === today);
    const blockers = workspace.dailyUpdates.filter(hasOpenBlocker);
    const escalated = blockers.filter((update) => emailKey(update.escalatedTo) === emailKey(user.email));
    const missing = missingCheckIns(manager ? workspace.members : [user], workspace.dailyUpdates, today);
    return [
        overdue.length && { id: 'overdue', title: `${overdue.length} overdue assignment${overdue.length === 1 ? '' : 's'}`, detail: 'Review due dates and progress.', view: manager ? 'work' : 'my-work', filters: { overdue: true } },
        due.length && { id: 'due', title: `${due.length} assignment${due.length === 1 ? '' : 's'} due today`, detail: 'See what needs to finish today.', view: manager ? 'work' : 'my-work', filters: { from: today, to: today } },
        escalated.length && { id: 'escalated', title: `${escalated.length} blocker${escalated.length === 1 ? '' : 's'} escalated to you`, detail: 'Your team needs help.', view: 'updates', filters: { blockers: true, escalated: true } },
        blockers.length && { id: 'blockers', title: `${blockers.length} unresolved blocker${blockers.length === 1 ? '' : 's'}`, detail: 'Follow up on open issues.', view: manager ? 'updates' : 'my-work', filters: { blockers: true } },
        missing.length && { id: 'missing', title: manager ? `${missing.length} check-in${missing.length === 1 ? '' : 's'} missing today` : 'Today’s check-in is missing', detail: manager ? 'See who has not reported yet.' : 'Log your progress and blockers.', view: manager ? 'updates' : 'daily-log', filters: { missing: true, date: today } },
    ].filter(Boolean);
}
