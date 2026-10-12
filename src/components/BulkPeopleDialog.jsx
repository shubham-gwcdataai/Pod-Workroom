import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { managerFor, parentRole, roleLabels } from '../utils/hierarchy';

export default function BulkPeopleDialog({ members, onSave, onClose, busy, initialSelected = [] }) {
    const [selected, setSelected] = useState(initialSelected);
    const [managers, setManagers] = useState({ 'team-head': '', 'team-member': '' });
    const [role, setRole] = useState('');
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const people = members.filter((person) => (!role || person.role === role) && `${person.name} ${person.email}`.toLowerCase().includes(search.toLowerCase()));
    const chosen = members.filter((person) => selected.includes(person.email));
    const groups = ['team-head', 'team-member'].map((value) => ({ role: value, people: chosen.filter((person) => person.role === value) })).filter((group) => group.people.length);
    const leads = chosen.filter((person) => person.role === 'team-lead').length;
    const moveCount = groups.reduce((count, group) => count + group.people.length, 0);
    async function submit(event) {
        event.preventDefault();
        try {
            const result = await onSave(selected, managers);
            if (!result.failed) onClose();
            else { setError(`${result.failed} people could not be reassigned. ${result.warnings.join(' ')}`); setSelected(result.failedIds); }
        } catch (failure) { setError(failure.message); }
    }
    return <div className="modal-backdrop" onMouseDown={() => !busy && onClose()}>
        <section className="task-dialog member-dialog" role="dialog" aria-modal="true" aria-labelledby="bulk-people-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span className="panel-overline">REPORTING LINES</span><h2 id="bulk-people-title">Reassign people</h2></div><button className="icon-button" disabled={busy} aria-label="Close reassignment" onClick={onClose}><X size={18} /></button></header>
            <form onSubmit={submit}>
                <p className="form-hint">Choose a new lead for heads and a new head for members. Team leads report to Admin.</p>
                <div className="form-row"><label>Search people<input autoFocus disabled={busy} placeholder="Name or email" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label>Show role<select disabled={busy} value={role} onChange={(event) => setRole(event.target.value)}><option value="">All roles</option>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
                <div className="bulk-people-list">{people.map((person) => <label key={person.email}><input disabled={busy || person.role === 'team-lead'} type="checkbox" checked={selected.includes(person.email)} onChange={(event) => setSelected((previous) => event.target.checked ? [...previous, person.email] : previous.filter((email) => email !== person.email))} /><span><strong>{person.name}</strong><small>{roleLabels[person.role]} · {person.role === 'team-lead' ? 'Reports to Admin' : `Reports to ${managerFor(person, members)?.name || 'Needs assignment'}`}</small></span></label>)}{!people.length && <p>No matching people.</p>}</div>
                <p className="form-hint">{moveCount} people to move, including selections hidden by search.{leads > 0 ? ` ${leads} selected ${leads === 1 ? 'lead stays' : 'leads stay'} with Admin.` : ''}</p>
                <div className="reassignment-groups">{groups.map((group) => <section key={group.role} className="reassignment-group"><div><strong>{group.people.length} {group.role === 'team-head' ? 'team heads' : 'team members'}</strong><ArrowRight size={15} /><span>{roleLabels[parentRole[group.role]]}</span></div><label>New {roleLabels[parentRole[group.role]].toLowerCase()}<select disabled={busy} required value={managers[group.role]} onChange={(event) => setManagers((previous) => ({ ...previous, [group.role]: event.target.value }))}><option value="">Choose a manager</option>{members.filter((person) => person.role === parentRole[group.role]).map((person) => <option key={person.email} value={person.email}>{person.name} · {person.email}</option>)}</select></label></section>)}</div>
                {error && <p role="alert" className="dialog-error">{error}</p>}
                <footer><button className="button-secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="button-primary" disabled={busy || !moveCount || groups.some((group) => !managers[group.role])}>{busy ? 'Saving…' : `Move ${moveCount} ${moveCount === 1 ? 'person' : 'people'}`}</button></footer>
            </form>
        </section>
    </div>;
}
