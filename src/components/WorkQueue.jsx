import { useState } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import { initials, prettyDate, inDateRange, isOverdue } from '../utils/date';
import { emailKey } from '../utils/hierarchy';
import { filterBranch } from '../utils/dashboard';
import { EmptyState, PageIntro } from './Shared';
import { DateFilters, TeamFilters } from './FilterControls';
import TaskDetails from './TaskDetails';
import DeleteDialog from './DeleteDialog';

export default function WorkQueue({ tasks, members, onStatusChange, onNewTask, canManage = true, initialFilters = {}, onReassign, onDelete, onBulkStatus, busy }) {
    const [filters, setFilters] = useState({ status: 'All work', search: '', from: '', to: '', ...initialFilters });
    const [selected, setSelected] = useState([]);
    const [owner, setOwner] = useState('');
    const [details, setDetails] = useState(null);
    const [status, setStatus] = useState('');
    const [deleting, setDeleting] = useState([]);
    const [deleteError, setDeleteError] = useState('');
    const change = (changes) => { setFilters((previous) => ({ ...previous, ...changes })); setSelected([]); };
    const emails = new Set(filterBranch(members, filters.leadEmail, filters.headEmail).map((person) => emailKey(person.email)));
    const filtered = tasks.filter((task) => {
        const person = members.find((member) => emailKey(member.email) === emailKey(task.memberEmail));
        return (!(filters.leadEmail || filters.headEmail) || emails.has(emailKey(task.memberEmail))) &&
            (!filters.ownerEmail || emailKey(task.memberEmail) === emailKey(filters.ownerEmail)) &&
            (filters.status === 'All work' || (filters.status === 'Open' ? task.status !== 'Complete' : task.status === filters.status)) &&
            (!filters.overdue || isOverdue(task)) && inDateRange(task.dueDate, filters.from, filters.to) &&
            `${task.title} ${task.category} ${task.memberEmail} ${person?.name || ''}`.toLowerCase().includes(filters.search.toLowerCase());
    });
    const selectedIds = filtered.filter((task) => selected.includes(task.id)).map((task) => task.id);
    async function confirmDelete() {
        try {
            const result = await onDelete(deleting.map((task) => task.id));
            setSelected(result.failedIds);
            setDeleting(deleting.filter((task) => result.failedIds.includes(task.id)));
            setDeleteError(result.warnings.join(' '));
        } catch (failure) { setDeleteError(failure.message); }
    }
    async function updateStatuses() {
        try { const result = await onBulkStatus(selectedIds, status); setSelected(result.failedIds); }
        catch { /* Save failures appear in the workspace feedback. */ }
    }
    async function reassign() {
        try {
            const result = await onReassign(selectedIds, owner);
            setSelected(result.failedIds);
        } catch { /* The workspace displays the save failure. */ }
    }
    return <>
        <PageIntro eyebrow="POD OPERATIONS" title={canManage ? 'Work queue' : 'Team work'} subtitle={canManage ? 'Select assignments to reassign, update status, or delete them.' : 'Assignments within your reporting branch. Update your own tasks in My work.'} actions={canManage && <button className="button-primary" onClick={onNewTask}><Plus size={17} /> New assignment</button>} />
        <div className="report-filters"><TeamFilters members={members} {...filters} onChange={change} /><DateFilters label="Due date" {...filters} onChange={change} /><label className="check-filter"><input type="checkbox" checked={Boolean(filters.overdue)} onChange={(event) => change({ overdue: event.target.checked })} />Overdue only</label><button className="button-secondary" onClick={() => change({ status: 'All work', search: '', from: '', to: '', leadEmail: '', headEmail: '', ownerEmail: '', overdue: false })}>Clear filters</button></div>
        {filters.ownerEmail && <p className="filter-context">Owner: {members.find((member) => emailKey(member.email) === emailKey(filters.ownerEmail))?.name || filters.ownerEmail}</p>}
        <section className="queue-panel panel">
            <div className="queue-toolbar"><div className="filter-tabs">{['All work', 'Open', 'Not started', 'In progress', 'Complete'].map((status) => <button key={status} className={filters.status === status ? 'selected' : ''} onClick={() => change({ status })}>{status}</button>)}</div><label className="search-field"><Search size={16} /><input aria-label="Search assignments" placeholder="Find an assignment or owner" value={filters.search} onChange={(event) => change({ search: event.target.value })} /></label></div>
            {canManage && selectedIds.length > 0 && <div className="bulk-bar" aria-label="Selected assignment actions"><strong>{selectedIds.length} selected</strong><label>Assign to<select aria-label="Reassign selected work to" value={owner} disabled={busy} onChange={(event) => setOwner(event.target.value)}><option value="">Choose a person</option>{members.map((person) => <option key={person.email} value={person.email}>{person.name} · {person.email}</option>)}</select></label><button className="button-secondary" disabled={busy || !owner} onClick={reassign}>Reassign</button>{onBulkStatus && <><label>Status<select aria-label="Status for selected assignments" disabled={busy} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Choose status</option>{['Not started', 'In progress', 'Complete'].map((value) => <option key={value}>{value}</option>)}</select></label><button className="button-secondary" disabled={busy || !status} onClick={updateStatuses}>Apply status</button></>}{onDelete && <button className="button-danger" disabled={busy} onClick={() => { setDeleting(filtered.filter((task) => selectedIds.includes(task.id))); setDeleteError(''); }}><Trash2 size={15} />Delete selected</button>}<button className="icon-button" disabled={busy} aria-label="Clear assignment selection" onClick={() => setSelected([])}><X size={16} /></button></div>}
            <div className="queue-table-wrap"><table className="queue-table"><thead><tr>{canManage && <th><input type="checkbox" aria-label="Select all shown assignments" disabled={busy || !filtered.length} checked={filtered.length > 0 && filtered.every((task) => selected.includes(task.id))} onChange={(event) => setSelected(event.target.checked ? filtered.map((task) => task.id) : [])} /></th>}<th>Assignment</th><th>Owner</th><th>Priority</th><th>Due date</th><th>Status</th>{canManage && onDelete && <th>Actions</th>}</tr></thead><tbody>{filtered.map((task) => {
                const person = members.find((member) => emailKey(member.email) === emailKey(task.memberEmail));
                return <tr key={task.id}>{canManage && <td><input type="checkbox" disabled={busy} aria-label={`Select ${task.title}`} checked={selected.includes(task.id)} onChange={(event) => setSelected((previous) => event.target.checked ? [...previous, task.id] : previous.filter((id) => id !== task.id))} /></td>}<td><button className="task-title-button" onClick={() => setDetails(task)}>{task.title}</button><small>{task.category}</small></td><td><span className="owner-cell"><span className="avatar avatar-small">{person?.initials || initials(person?.name)}</span>{person?.name || task.memberEmail || 'Unassigned'}</span></td><td><span className={`priority priority-${task.priority?.toLowerCase()}`}>{task.priority}</span></td><td><span className={isOverdue(task) ? 'overdue-label' : ''}>{prettyDate(task.dueDate)}{isOverdue(task) ? ' · Overdue' : ''}</span></td><td>{canManage ? <select disabled={busy} className="status-select" aria-label={`Status for ${task.title}`} value={task.status} onChange={(event) => onStatusChange(task.id, event.target.value)}><option>Not started</option><option>In progress</option><option>Complete</option></select> : <span>{task.status}</span>}</td>{canManage && onDelete && <td><button className="person-action delete-action" disabled={busy} aria-label={`Delete assignment ${task.title}`} onClick={() => { setDeleting([task]); setDeleteError(''); }}><Trash2 size={14} />Delete</button></td>}</tr>;
            })}</tbody></table>{filtered.length === 0 && <EmptyState title="No matching assignments" detail="Try another status, date, or team." />}</div>
            <div className="queue-foot"><span>Showing {filtered.length} of {tasks.length} assignments</span><span>{canManage ? 'Changes save automatically' : 'Team assignments are read-only'}</span></div>
        </section>
        {details && <TaskDetails task={details} members={members} onClose={() => setDetails(null)} />}
        {deleting.length > 0 && <DeleteDialog title={`Delete ${deleting.length} ${deleting.length === 1 ? 'assignment' : 'assignments'}?`} description="These assignments will be permanently removed, including completed work. Daily check-ins remain available. The deletion will be recorded in activity history." items={deleting.map((task) => ({ id: task.id, name: task.title, detail: task.memberEmail }))} busy={busy} error={deleteError} onClose={() => setDeleting([])} onConfirm={confirmDelete} />}
    </>;
}
