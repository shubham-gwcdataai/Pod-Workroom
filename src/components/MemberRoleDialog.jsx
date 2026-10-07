import { X } from 'lucide-react';
import { useState } from 'react';
import { emailKey, parentRole, roleLabels } from '../utils/hierarchy';

export default function MemberRoleDialog({ member, members, onClose, onSave, busy }) {
    const [role, setRole] = useState(member.role || 'team-member');
    const [managerEmail, setManagerEmail] = useState(emailKey(member.managerEmail));
    const [error, setError] = useState('');
    const managers = members.filter((person) => person.role === parentRole[role] && emailKey(person.email) !== emailKey(member.email));
    async function submit(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError('');
        try {
            await onSave(member.email, {
                name: form.get('name').trim(),
                title: form.get('title').trim(),
                email: form.get('email').trim().toLowerCase(),
                role,
                managerEmail: role === 'team-lead' ? '' : managerEmail,
            });
        } catch (failure) { setError(failure.message || 'Could not save this person.'); }
    }
    return <div className="modal-backdrop" onMouseDown={() => !busy && onClose()}>
        <section className="task-dialog member-dialog" role="dialog" aria-modal="true" aria-labelledby="role-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span className="panel-overline">PERSON DETAILS</span><h2 id="role-dialog-title">Edit {member.name}</h2></div><button className="icon-button" disabled={busy} aria-label="Close" onClick={onClose}><X size={17} /></button></header>
            <form onSubmit={submit}>
                <div className="form-row">
                    <label>Full name<input autoFocus name="name" defaultValue={member.name} required disabled={busy} /></label>
                    <label>Job title<input name="title" defaultValue={member.title || ''} required disabled={busy} /></label>
                </div>
                <label>Work email<input name="email" type="email" defaultValue={member.email} required disabled={busy} /></label>
                <p className="form-hint">Changing email updates their POD sign-in address and keeps their assignments and reporting links.</p>
                <label>Team role<select disabled={busy} value={role} onChange={(event) => { setRole(event.target.value); setManagerEmail(''); setError(''); }}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                {role !== 'team-lead' ? <label>Reports to · {roleLabels[parentRole[role]]}
                    <select disabled={busy} value={managers.some((person) => emailKey(person.email) === managerEmail) ? managerEmail : ''} onChange={(event) => setManagerEmail(event.target.value)} required={role !== member.role || managerEmail !== emailKey(member.managerEmail)}><option value="">Select a {roleLabels[parentRole[role]].toLowerCase()}</option>{managers.map((person) => <option key={person.email} value={emailKey(person.email)}>{person.name} · {person.email}</option>)}</select>
                    {managers.length === 0 && <span className="form-hint">Add a {roleLabels[parentRole[role]].toLowerCase()} first.</span>}
                </label> : <p className="form-hint">Team leads report to the admin.</p>}
                <p className="form-hint">If changing this role, reassign any direct reports first.</p>
                {error && <p className="dialog-error" role="alert">{error}</p>}
                <footer><button className="button-secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></footer>
            </form>
        </section>
    </div>;
}
