export const roleLabels = {
    'team-lead': 'Team lead',
    'team-head': 'Team head',
    'team-member': 'Team member',
};

export const parentRole = { 'team-head': 'team-lead', 'team-member': 'team-head' };
export const emailKey = (email) => email?.trim().toLowerCase() || '';

export function managerFor(member, members) {
    return members.find((candidate) =>
        emailKey(candidate.email) === emailKey(member.managerEmail) &&
        candidate.role === parentRole[member.role],
    );
}

export function visibleMembers(members, user) {
    if (!user) return [];
    if (user.role === 'admin') return members;
    const visible = new Set([emailKey(user.email)]);
    const queue = members.filter((member) => emailKey(member.email) === emailKey(user.email));
    while (queue.length) {
        const manager = queue.shift();
        for (const member of members) {
            if (parentRole[member.role] === manager.role &&
                emailKey(member.managerEmail) === emailKey(manager.email) &&
                !visible.has(emailKey(member.email))) {
                visible.add(emailKey(member.email));
                queue.push(member);
            }
        }
    }
    return members.filter((member) => visible.has(emailKey(member.email)));
}

export function scopeWorkspace(workspace, user) {
    if (user?.role === 'admin') return workspace;
    const members = visibleMembers(workspace.members, user);
    const emails = new Set(members.map((member) => emailKey(member.email)));
    const manager = user && managerFor(user, workspace.members);
    return {
        members,
        tasks: workspace.tasks.filter((task) => emails.has(emailKey(task.memberEmail))),
        dailyUpdates: workspace.dailyUpdates.filter((update) => emails.has(emailKey(update.memberEmail))),
        ...(manager ? { reportingManager: { name: manager.name, email: manager.email, title: manager.title, role: manager.role } } : {}),
    };
}

export function validateHierarchy(member, members) {
    if (!roleLabels[member.role]) throw new Error('Select a valid team role.');
    if (member.role === 'team-lead') return;
    if (emailKey(member.email) === emailKey(member.managerEmail)) {
        throw new Error('A person cannot report to themselves.');
    }
    if (!managerFor(member, members)) {
        throw new Error(`Select a ${roleLabels[parentRole[member.role]].toLowerCase()} for this person.`);
    }
}
