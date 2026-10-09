import { Plus, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { emailKey, parentRole, roleLabels } from '../utils/hierarchy';
import { userDirectory } from '../services/userDirectory';

export default function MemberDialog({ onClose, onSave, busy, members, directory = userDirectory }) {
    const [error, setError] = useState('');
    const [role, setRole] = useState('team-member');
    const [profile, setProfile] = useState({ name: '', email: '', title: '' });
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [lookupError, setLookupError] = useState('');
    const [searching, setSearching] = useState(false);
    const [selecting, setSelecting] = useState(false);
    const requestVersion = useRef(0);
    const invalidateLookup = useCallback(() => ++requestVersion.current, []);
    const autoFilled = useRef(false);
    const fillPerson = useCallback(async (person, version) => {
        setSelecting(true); setLookupError('');
        try {
            const details = await directory.details(person);
            if (requestVersion.current !== version) return;
            const exists = members.some((member) => emailKey(member.email) === details.email);
            if (exists) { setResults([details]); setLookupError('This person is already in the POD.'); return; }
            setProfile({ name: details.name, email: details.email, title: details.title || '' });
            autoFilled.current = true;
            setResults(null); setError('');
        }
        catch (failure) {
            if (requestVersion.current === version) {
                setProfile({ name: person.name || '', email: '', title: person.title || '' });
                autoFilled.current = true;
                setLookupError(failure.message);
            }
        }
        finally { if (requestVersion.current === version) setSelecting(false); }
    }, [directory, members]);
    useEffect(() => {
        const version = invalidateLookup();
        if (query.trim().length < 2) return;
        const timer = setTimeout(async () => {
            setSearching(true); setLookupError('');
            try {
                const matches = await directory.search(query);
                if (requestVersion.current !== version) return;
                setResults(matches);
                if (matches.length === 1) await fillPerson(matches[0], version);
            }
            catch (failure) { if (requestVersion.current === version) setLookupError(failure.message); }
            finally { if (requestVersion.current === version) setSearching(false); }
        }, 350);
        return () => { clearTimeout(timer); invalidateLookup(); };
    }, [query, directory, fillPerson, invalidateLookup]);
    function changeQuery(value) {
        invalidateLookup();
        setQuery(value); setResults(null); setLookupError(''); setSearching(false); setSelecting(false);
        if (autoFilled.current) { setProfile({ name: '', email: '', title: '' }); autoFilled.current = false; }
    }
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
                <section className="domo-person-lookup" aria-label="Domo user search">
                    <label>Find a Domo user<div className="person-lookup-search"><Search size={16} /><input autoFocus aria-label="Search Domo users" placeholder="Start typing a name or email" value={query} disabled={busy} onChange={(event) => changeQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }} /></div></label>
                    <p className="form-hint" role="status">{searching || selecting ? 'Finding user details…' : 'Search runs as you type. One match fills automatically; choose a person when several match.'}</p>
                    {lookupError && <p className="dialog-error" role="alert">{lookupError}</p>}
                    {results && <div className="person-lookup-results" aria-live="polite">{results.length === 0 ? <p>No matching Domo users. Try another name or enter details below.</p> : <><p>{results.length} {results.length === 1 ? 'match' : 'matches'}{results.length > 20 ? ' · Showing the first 20. Refine your search for more.' : ''}</p>{results.slice(0, 20).map((person) => {
                        const exists = members.some((member) => emailKey(member.email) === person.email);
                        return <button type="button" key={person.id ?? person.email} disabled={busy || selecting || exists} onClick={() => fillPerson(person, invalidateLookup())}><span><strong>{person.name || 'Unnamed Domo user'}</strong><small>{person.email || 'Email not included in search result'}</small></span><span>{exists ? 'Already added' : selecting ? 'Loading…' : 'Use this person'}</span></button>;
                    })}</>}</div>}
                </section>
                <label>Work email<input name="email" type="email" autoComplete="email" placeholder="person@company.com" required disabled={busy || selecting} value={profile.email} onChange={(event) => setProfile((previous) => ({ ...previous, email: event.target.value }))} /></label>
                <div className="form-row"><label>Full name<input name="name" required disabled={busy || selecting} value={profile.name} onChange={(event) => setProfile((previous) => ({ ...previous, name: event.target.value }))} /></label><label>Job title<input name="title" required disabled={busy || selecting} value={profile.title} onChange={(event) => setProfile((previous) => ({ ...previous, title: event.target.value }))} /></label></div>
                <label>Team role<select value={role} onChange={(event) => { setRole(event.target.value); setError(''); }}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                {role !== 'team-lead' ? <label>Reports to · {roleLabels[parentRole[role]]}
                    <select key={role} name="managerEmail" defaultValue="" required><option value="">Select a {roleLabels[parentRole[role]].toLowerCase()}</option>{managers.map((person) => <option key={person.email} value={person.email}>{person.name} · {person.email}</option>)}</select>
                    {managers.length === 0 && <span className="form-hint">Add a {roleLabels[parentRole[role]].toLowerCase()} first.</span>}
                </label> : <p className="form-hint">Team leads report to the admin. Assign heads to this lead after adding them.</p>}
                {error && <p className="dialog-error" role="alert">{error}</p>}
                <footer><button className="button-secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="button-primary" type="submit" disabled={busy || selecting || searching || (role !== 'team-lead' && managers.length === 0)}><Plus size={15} />{busy ? 'Saving…' : 'Add person'}</button></footer>
            </form>
        </section>
    </div>;
}
