import { useState } from 'react';
import { Plus, Search, X, Trash2 } from 'lucide-react';
import { PageIntro } from './Shared';
import PeopleDirectory from './PeopleDirectory';
import { emailKey, roleLabels } from '../utils/hierarchy';
import { filterBranch } from '../utils/dashboard';
import { TeamFilters } from './FilterControls';
import BulkPeopleDialog from './BulkPeopleDialog';
import { directoryRows, directoryPage } from '../utils/directory';
import DeleteDialog from './DeleteDialog';

export default function TeamView({ members: allMembers, tasks, reportingManager, canManage, onAddMember, onEditRole, onDeleteMember, onDeletePeople, busy, initialFilters = {}, onReassignPeople }) {
    const [search, setSearch] = useState('');
    const [toDelete, setToDelete] = useState(null);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState(initialFilters);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [role, setRole] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selected, setSelected] = useState([]);
    const [deletePeople, setDeletePeople] = useState([]);
    const [selectedReassignment, setSelectedReassignment] = useState(false);
    const members = filterBranch(allMembers, filters.leadEmail, filters.headEmail).filter((person) => !filters.ownerEmail || emailKey(person.email) === emailKey(filters.ownerEmail));
    const rows = directoryRows(allMembers, tasks, reportingManager).filter(({ person }) => members.includes(person));
    const results = directoryPage(rows, { search, role, page, pageSize });
    const selectedPeople = allMembers.filter((person) => selected.includes(person.email));
    const canMove = selectedPeople.length > 0 && selectedPeople[0].role !== 'team-lead' && selectedPeople.every((person) => person.role === selectedPeople[0].role);
    const selectPerson = (email, checked) => setSelected((previous) => checked ? [...new Set([...previous, email])] : previous.filter((value) => value !== email));
    function selectPage(checked) {
        const emails = results.rows.map(({ person }) => person.email);
        setSelected((previous) => checked ? [...new Set([...previous, ...emails])] : previous.filter((email) => !emails.includes(email)));
    }
    async function confirmBulkDelete() {
        try {
            const result = await onDeletePeople(deletePeople.map((person) => person.email));
            setSelected(result.failedIds);
            setDeletePeople(deletePeople.filter((person) => result.failedIds.includes(person.email)));
            setError(result.warnings.join(' '));
        } catch (failure) { setError(failure.message); }
    }
    const reportCount = toDelete ? allMembers.filter((person) => emailKey(person.managerEmail) === emailKey(toDelete.email)).length : 0;
    const changeFilters = (change) => { setFilters((previous) => ({ ...previous, ...change })); setPage(1); setSelected([]); };
    async function confirmDelete() {
        try {
            await onDeleteMember(toDelete.email);
            setToDelete(null);
        } catch (failure) {
            setError(failure.message || 'Could not delete this person. Try again.');
        }
    }
    return <>
        <PageIntro eyebrow="PEOPLE & OWNERSHIP" title={canManage ? 'Team directory' : 'My team'}
            subtitle={canManage ? 'Assign leads, heads, and members. See who reports to whom.' : 'Your team and the people assigned under you.'}
            actions={canManage && <><button className="button-secondary" onClick={() => { setSelectedReassignment(false); setBulkOpen(true); }}>Reassign people</button><button className="button-primary" onClick={onAddMember}><Plus size={16} /> Add person</button></>} />
        <div className="directory-role-tabs" role="group" aria-label="Filter people by role">
            {[['', 'All people'], ...Object.entries(roleLabels)].map(([key, label]) => <button key={key} aria-pressed={role === key} onClick={() => { setRole(key); setPage(1); setSelected([]); }}><span>{key ? `${label}s` : label}</span><strong>{key ? members.filter((person) => person.role === key).length : members.length}</strong></button>)}
        </div>
        <div className="report-filters directory-filters"><label className="search-field"><Search size={16} /><input aria-label="Search people" placeholder="Search people, email, or manager" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); setSelected([]); }} /></label><TeamFilters members={allMembers} {...filters} onChange={changeFilters} /><button className="text-link" onClick={() => { setFilters({}); setSearch(''); setRole(''); setPage(1); setSelected([]); }}>Clear filters</button></div>
        {canManage && selectedPeople.length > 0 && <div className="bulk-bar people-bulk-bar" aria-label="Selected people actions"><strong>{selectedPeople.length} selected across pages</strong><button className="button-secondary" disabled={busy || !canMove} onClick={() => { setSelectedReassignment(true); setBulkOpen(true); }}>Reassign selected</button>{!canMove && <span>Select heads or members of the same role to reassign.</span>}<button className="button-danger" disabled={busy} onClick={() => { setDeletePeople(selectedPeople); setError(''); }}><Trash2 size={15} />Delete selected</button><button className="icon-button" disabled={busy} aria-label="Clear people selection" onClick={() => setSelected([])}><X size={16} /></button></div>}
        <PeopleDirectory results={results} pageSize={pageSize} onPageSize={(size) => { setPageSize(size); setPage(1); }} onPage={setPage} busy={busy} selected={selected} onSelect={canManage ? selectPerson : undefined} onSelectPage={selectPage} onEdit={canManage ? onEditRole : undefined} onDelete={canManage ? (person) => { setToDelete(person); setError(''); } : undefined} />
        {canManage && bulkOpen && <BulkPeopleDialog members={allMembers} initialSelected={selectedReassignment ? selectedPeople.map((person) => person.email) : []} onClose={() => setBulkOpen(false)} onSave={async (emails, manager) => { const result = await onReassignPeople(emails, manager); setSelected(result.failedIds); return result; }} busy={busy} />}
        {deletePeople.length > 0 && <DeleteDialog title={`Delete ${deletePeople.length} people?`} description="These people will lose POD access. Assignments and check-in history will be retained. Their remaining direct reports will need a new manager." items={deletePeople.map((person) => ({ id: person.email, name: person.name, detail: person.email }))} busy={busy} error={error} onClose={() => setDeletePeople([])} onConfirm={confirmBulkDelete} />}
        {toDelete && <div className="modal-backdrop" onMouseDown={() => !busy && setToDelete(null)}>
            <section className="task-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" onMouseDown={(event) => event.stopPropagation()}>
                <header><h2 id="delete-title">Delete {toDelete.name}?</h2><button autoFocus className="icon-button" disabled={busy} aria-label="Close" onClick={() => setToDelete(null)}><X size={18} /></button></header>
                <p className="delete-description">This person will lose access to the POD. Their assignments and check-in history will be retained.</p>
                {reportCount > 0 && <p className="delete-description">{reportCount} direct {reportCount === 1 ? 'report will' : 'reports will'} move to “Needs assignment”. You can assign them to another manager.</p>}
                {error && <p role="alert" className="dialog-error">{error}</p>}
                <footer><button className="button-secondary" disabled={busy} onClick={() => setToDelete(null)}>Cancel</button><button className="button-danger" disabled={busy} onClick={confirmDelete}>{busy ? 'Deleting…' : 'Delete person'}</button></footer>
            </section>
        </div>}
    </>;
}
