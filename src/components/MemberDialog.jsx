import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { parentRole, roleLabels } from '../utils/hierarchy';

export default function MemberDialog({ onClose, onSave, busy, members }) {
    const [error, setError] = useState('');
    const [role, setRole] = useState('team-member');
    const managers = members.filter((person) => person.role === parentRole[role]);
    async function submit(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
            await onSave({ email: form.get('email').trim().toLowerCase(), name: form.get('name').trim(), title: form.get('title').trim(), role, managerEmail: role === 'team-lead' ? '' : form.get('managerEmail') });
        } catch (failure) { setError(failure.message || 'Could not save this person.'); }
    }
    return <div className="modal-backdrop" onMouseDown={() => !busy && onClose()}>
        <section className="task-dialog member-dialog" role="dialog" aria-modal="true" aria-labelledby="member-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span className="panel-overline">POD MEMBERSHIP</span><h2 id="member-dialog-title">Add a person</h2></div><button className="icon-button" disabled={busy} aria-label="Close" onClick={onClose}><X size={17} /></button></header>
            <form onSubmit={submit}>
                <label>Work email<input autoFocus name="email" type="email" autoComplete="email" placeholder="person@company.com" required /></label>
                <div className="form-row"><label>Full name<input name="name" required /></label><label>Job title<input name="title" required /></label></div>
                <label>Team role<select value={role} onChange={(event) => { setRole(event.target.value); setError(''); }}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                {role !== 'team-lead' ? <label>Reports to · {roleLabels[parentRole[role]]}
                    <select key={role} name="managerEmail" defaultValue="" required><option value="">Select a {roleLabels[parentRole[role]].toLowerCase()}</option>{managers.map((person) => <option key={person.email} value={person.email}>{person.name} · {person.email}</option>)}</select>
                    {managers.length === 0 && <span className="form-hint">Add a {roleLabels[parentRole[role]].toLowerCase()} first.</span>}
                </label> : <p className="form-hint">Team leads report to the admin. Assign heads to this lead after adding them.</p>}
                {error && <p className="dialog-error" role="alert">{error}</p>}
                <footer><button className="button-secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="button-primary" type="submit" disabled={busy || (role !== 'team-lead' && managers.length === 0)}><Plus size={15} />{busy ? 'Saving…' : 'Add person'}</button></footer>
            </form>
        </section>
    </div>;
}
