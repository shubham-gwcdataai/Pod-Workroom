import { useState } from 'react';
import { X } from 'lucide-react';
import { managerFor, parentRole, roleLabels } from '../utils/hierarchy';

export default function BulkPeopleDialog({ members, onSave, onClose, busy, initialSelected = [] }) {
    const [role, setRole] = useState(members.find((person) => initialSelected.includes(person.email))?.role || 'team-member');
    const [selected, setSelected] = useState(initialSelected);
    const [manager, setManager] = useState('');
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const people = members.filter((person) => person.role === role && `${person.name} ${person.email}`.toLowerCase().includes(search.toLowerCase()));
    async function submit(event) {
        event.preventDefault();
        try { const result = await onSave(selected, manager); if (!result.failed) onClose(); else { setError(`${result.failed} people could not be reassigned. ${result.warnings.join(' ')}`); setSelected(result.failedIds); } }
        catch (failure) { setError(failure.message); }
    }
    return <div className="modal-backdrop" onMouseDown={() => !busy && onClose()}><section className="task-dialog member-dialog" role="dialog" aria-modal="true" aria-labelledby="bulk-people-title" onMouseDown={(event) => event.stopPropagation()}><header><h2 id="bulk-people-title">Reassign people</h2><button className="icon-button" disabled={busy} aria-label="Close reassignment" onClick={onClose}><X size={18} /></button></header><form onSubmit={submit}>
        <label>People to move<select autoFocus disabled={busy} value={role} onChange={(event) => { setRole(event.target.value); setSelected([]); setManager(''); setError(''); }}><option value="team-head">Team heads</option><option value="team-member">Team members</option></select></label>
        <label>Search people<input disabled={busy} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <div className="bulk-people-list">{people.map((person) => <label key={person.email}><input disabled={busy} type="checkbox" checked={selected.includes(person.email)} onChange={(event) => setSelected((previous) => event.target.checked ? [...previous, person.email] : previous.filter((email) => email !== person.email))} /><span><strong>{person.name}</strong><small>Currently reports to {managerFor(person, members)?.name || 'Needs assignment'}</small></span></label>)}{people.length === 0 && <p>No matching people.</p>}</div>
        <label>New {roleLabels[parentRole[role]].toLowerCase()}<select disabled={busy} required value={manager} onChange={(event) => setManager(event.target.value)}><option value="">Choose a manager</option>{members.filter((person) => person.role === parentRole[role]).map((person) => <option key={person.email} value={person.email}>{person.name} · {person.email}</option>)}</select></label>
        <p className="form-hint">{selected.length} selected, including selections hidden by search. Roles and work assignments stay the same.</p>
        {error && <p role="alert" className="dialog-error">{error}</p>}<footer><button className="button-secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="button-primary" disabled={busy || !selected.length || !manager}>{busy ? 'Saving…' : `Move ${selected.length} people`}</button></footer>
    </form></section></div>;
}
