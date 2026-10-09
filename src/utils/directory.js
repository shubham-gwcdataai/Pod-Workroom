import { emailKey, managerFor, roleLabels } from './hierarchy.js';

export function directoryRows(members, tasks, reportingManager) {
    const context = reportingManager ? [...members, reportingManager] : members;
    return members.map((person) => {
        const manager = managerFor(person, context);
        const lead = person.role === 'team-lead' ? person : manager?.role === 'team-lead' ? manager : manager && managerFor(manager, context);
        const assigned = tasks.filter((task) => emailKey(task.memberEmail) === emailKey(person.email));
        const done = assigned.filter((task) => task.status === 'Complete').length;
        return { person, manager, lead, open: assigned.length - done, done, completion: assigned.length ? Math.round(done / assigned.length * 100) : 0 };
    });
}

export function directoryPage(rows, { search = '', role = '', page = 1, pageSize = 10 } = {}) {
    const query = search.trim().toLowerCase();
    const matches = rows.filter(({ person, manager, lead }) => (!role || person.role === role) &&
        [person.name, person.email, person.title, roleLabels[person.role], manager?.name, lead?.name].filter(Boolean).join(' ').toLowerCase().includes(query))
        .sort((a, b) => (a.person.name || '').localeCompare(b.person.name || '') || emailKey(a.person.email).localeCompare(emailKey(b.person.email)));
    const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
    const currentPage = Math.min(Math.max(1, page), pageCount);
    const start = (currentPage - 1) * pageSize;
    return { rows: matches.slice(start, start + pageSize), total: matches.length, pageCount, currentPage, start };
}
