import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { parentRole, roleLabels } from '../utils/hierarchy';
import { canSearchDomoUsers, searchDomoUsers } from '../podStore';

export default function MemberDialog({ onClose, onSave, busy, members, admin }) {
    const [error, setError] = useState('');
    const [role, setRole] = useState('team-member');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [title, setTitle] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [userMatches, setUserMatches] = useState([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [userSearchError, setUserSearchError] = useState('');
    const canFindDomoUsers = canSearchDomoUsers();
    const managers = [
        ...members.filter((person) => person.role === parentRole[role]),
        ...(role === 'team-head' && admin ? [{ ...admin, role: 'team-lead' }] : []),
    ];

    useEffect(() => {
        let current = true;
        const query = userSearch.trim();
        if (!query || !canFindDomoUsers) return () => { current = false; };
        const timeout = window.setTimeout(() => {
            searchDomoUsers(query).then((matches) => {
                if (!current) return;
                if (matches.length === 1) {
                    setEmail(matches[0].email);
                    setName(matches[0].name);
                    setTitle(matches[0].title);
                    setUserSearch('');
                    return;
                }
                setUserMatches(matches);
            }).catch((failure) => {
                if (current) setUserSearchError(failure.message || 'Could not search Domo users.');
            }).finally(() => {
                if (current) setSearchingUsers(false);
            });
        }, 250);
        return () => {
            current = false;
            window.clearTimeout(timeout);
        };
    }, [userSearch, canFindDomoUsers]);

    function changeUserSearch(value) {
        setUserSearch(value);
        setUserMatches([]);
        setUserSearchError('');
        setSearchingUsers(Boolean(value.trim() && canFindDomoUsers));
    }

    function selectDomoUser(user) {
        setEmail(user.email);
        setName(user.name);
        setTitle(user.title);
        setUserSearch('');
        setUserMatches([]);
        setUserSearchError('');
        setSearchingUsers(false);
    }

    async function submit(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
            await onSave({ email: email.trim().toLowerCase(), name: name.trim(), title: title.trim(), role, managerEmail: role === 'team-lead' ? '' : form.get('managerEmail') });
        } catch (failure) { setError(failure.message || 'Could not save this person.'); }
    }
    return <div className="modal-backdrop" onMouseDown={() => !busy && onClose()}>
        <section className="task-dialog member-dialog" role="dialog" aria-modal="true" aria-labelledby="member-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span className="panel-overline">POD MEMBERSHIP</span><h2 id="member-dialog-title">Add a person</h2></div><button className="icon-button" disabled={busy} aria-label="Close" onClick={onClose}><X size={17} /></button></header>
            <form onSubmit={submit}>
                <section className="domo-user-lookup" aria-label="Find a Domo user">
                    <label htmlFor="domo-user-search">Find a Domo user</label>
                    <input id="domo-user-search" type="search" autoComplete="off" disabled={!canFindDomoUsers} placeholder={canFindDomoUsers ? 'Search by name or email' : 'Available through authenticated Domo dev'} value={userSearch} onChange={(event) => changeUserSearch(event.target.value)} />
                    <p className="form-hint">{canFindDomoUsers ? 'Search runs as you type.' : 'Open this app in Domo or localhost to search Domo users. You can still add a person manually.'}</p>
                    {searchingUsers && <p className="form-hint" role="status">Searching Domo users…</p>}
                    {userSearchError && <p className="dialog-error" role="alert">{userSearchError}</p>}
                    {!searchingUsers && !userSearchError && canFindDomoUsers && userSearch.trim() && userMatches.length === 0 && <p className="form-hint" role="status">No matching Domo users found.</p>}
                    {userMatches.length > 0 && <div className="domo-user-results" aria-live="polite">
                        <span className="form-hint">{userMatches.length} {userMatches.length === 1 ? 'match' : 'matches'}</span>
                        {userMatches.slice(0, 8).map((user) => <button className="domo-user-match" key={user.email} type="button" onClick={() => selectDomoUser(user)}>
                            <span><strong>{user.name}</strong><small>{user.email}</small></span><span>Use this person</span>
                        </button>)}
                        {userMatches.length > 8 && <span className="form-hint">Showing 8 matches. Refine your search.</span>}
                    </div>}
                </section>
                <label>Work email<input autoFocus name="email" type="email" autoComplete="email" placeholder="person@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
                <div className="form-row"><label>Full name<input name="name" value={name} onChange={(event) => setName(event.target.value)} required /></label><label>Job title<input name="title" value={title} onChange={(event) => setTitle(event.target.value)} required /></label></div>
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
