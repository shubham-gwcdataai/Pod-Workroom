import { Pencil, Trash2, Users } from 'lucide-react';
import { initials } from '../utils/date';
import { emailKey, managerFor, roleLabels } from '../utils/hierarchy';

export default function TeamHierarchy({ members, tasks, search = '', onEdit, onDelete, busy, rootEmail }) {
    const query = search.trim().toLowerCase();
    const children = (manager) => members.filter((person) => managerFor(person, members) === manager);
    const matches = (person) => `${person.name} ${person.email} ${person.title} ${roleLabels[person.role]}`.toLowerCase().includes(query);
    const branchMatches = (person) => matches(person) || children(person).some(branchMatches);
    const roots = members.filter((person) => person.role === 'team-lead' || emailKey(person.email) === emailKey(rootEmail));
    const unassigned = members.filter((person) => !roots.includes(person) && !managerFor(person, members));

    function renderPerson(person) {
        const assigned = tasks.filter((task) => emailKey(task.memberEmail) === emailKey(person.email));
        const done = assigned.filter((task) => task.status === 'Complete').length;
        const completion = assigned.length ? Math.round(done / assigned.length * 100) : 0;
        return <div className="hierarchy-person">
            <span className="avatar" style={{ background: person.color || '#e3ebe5' }}>{person.initials || initials(person.name)}</span>
            <div className="hierarchy-person-copy">
                <strong>{person.name}</strong>
                <span>{roleLabels[person.role] || 'Team member'}{person.title ? ` · ${person.title}` : ''}</span>
                <small>{person.email}</small>
            </div>
            <div className="person-work"><div><strong>{assigned.length - done}</strong> open · {done} done</div><span>{completion}% complete</span></div>
            {(onEdit || onDelete) && <div className="person-actions">
                {onEdit && <button type="button" disabled={busy} className="person-action" onClick={() => onEdit(person)} aria-label={`Edit ${person.name}`}><Pencil size={13} /> Edit</button>}
                {onDelete && <button type="button" disabled={busy} className="person-action delete-action" onClick={() => onDelete(person)} aria-label={`Delete ${person.name}`}><Trash2 size={13} /> Delete</button>}
            </div>}
        </div>;
    }

    function renderBranch(person, showAll = false) {
        const reports = children(person);
        const shown = reports.filter((report) => showAll || matches(person) || branchMatches(report));
        return <article key={person.email} className={`hierarchy-branch branch-${person.role}`}>
            {renderPerson(person)}
            {person.role !== 'team-member' && <details open={Boolean(query) || person.role === 'team-lead' || emailKey(person.email) === emailKey(rootEmail)}>
                <summary>{reports.length} {person.role === 'team-lead' ? 'team head' : 'team member'}{reports.length === 1 ? '' : 's'} <span>View team</span></summary>
                <div className="hierarchy-children">
                    {shown.map((report) => renderBranch(report, showAll || matches(person)))}
                    {reports.length === 0 && <p className="hierarchy-empty">No {person.role === 'team-lead' ? 'heads' : 'members'} assigned yet.</p>}
                </div>
            </details>}
        </article>;
    }

    const shownRoots = roots.filter(branchMatches);
    const shownUnassigned = unassigned.filter(branchMatches);
    if (shownRoots.length + shownUnassigned.length === 0) return <div className="hierarchy-empty-state"><Users size={24} /><strong>{members.length ? 'No matching people' : 'Build your team'}</strong><p>{members.length ? 'Try another name, email, or role.' : 'Add a team lead, then assign heads and members.'}</p></div>;
    return <div className="hierarchy-layout">
        <div className="lead-grid">{shownRoots.map((person) => renderBranch(person))}</div>
        {shownUnassigned.length > 0 && <section className="unassigned-team">
            <div className="unassigned-heading"><h3>Needs assignment <span>{unassigned.length}</span></h3><p>Assign each head to a lead and each member to a head.</p></div>
            <div className="lead-grid">{shownUnassigned.map((person) => renderBranch(person))}</div>
        </section>}
    </div>;
}
