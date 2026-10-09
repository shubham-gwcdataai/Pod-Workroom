import { ChevronLeft, ChevronRight, Pencil, Trash2, Users } from 'lucide-react';
import { initials } from '../utils/date';
import { roleLabels } from '../utils/hierarchy';

export default function PeopleDirectory({ results, pageSize, onPageSize, onPage, onEdit, onDelete, busy, selected = [], onSelect, onSelectPage }) {
    return <section className="people-directory panel" aria-label="People directory">
        {onSelect && <label className="mobile-select-page"><input type="checkbox" disabled={busy || !results.rows.length} aria-label="Select everyone on this page" checked={results.rows.length > 0 && results.rows.every(({ person }) => selected.includes(person.email))} onChange={(event) => onSelectPage(event.target.checked)} />Select this page</label>}
        <div className="directory-table-wrap">
            <table className="directory-table">
                <thead><tr>{onSelect && <th scope="col" className="selection-cell"><input type="checkbox" disabled={busy || !results.rows.length} aria-label="Select everyone on this page" checked={results.rows.length > 0 && results.rows.every(({ person }) => selected.includes(person.email))} onChange={(event) => onSelectPage(event.target.checked)} /></th>}<th scope="col">Person</th><th scope="col">Role</th><th scope="col">Reports to</th><th scope="col">Team lead</th><th scope="col">Workload</th>{onEdit && <th scope="col">Actions</th>}</tr></thead>
                <tbody>{results.rows.map(({ person, manager, lead, open, done, completion }) => <tr key={person.email}>
                    {onSelect && <td className="selection-cell" data-label="Select"><input type="checkbox" disabled={busy} aria-label={`Select ${person.name} (${person.email})`} checked={selected.includes(person.email)} onChange={(event) => onSelect(person.email, event.target.checked)} /></td>}
                    <td data-label="Person"><div className="directory-person"><span className="avatar" style={{ background: person.color || '#e3ebe5' }}>{initials(person.name)}</span><div><strong>{person.name}</strong><span>{person.title || roleLabels[person.role]}</span><small>{person.email}</small></div></div></td>
                    <td data-label="Role"><span className={`directory-role role-${person.role}`}>{roleLabels[person.role]}</span></td>
                    <td data-label="Reports to">{person.role === 'team-lead' ? <span className="directory-muted">POD admin</span> : manager ? <span className="directory-manager">{manager.name}</span> : <span className="directory-unassigned">Needs assignment</span>}</td>
                    <td data-label="Team lead"><span className={lead ? 'directory-manager' : 'directory-muted'}>{lead?.name || 'Unassigned'}</span></td>
                    <td data-label="Workload"><div className="directory-work"><span><strong>{open}</strong> open <span className="directory-muted">· {done} done</span></span><div className="directory-progress" aria-label={`${completion}% complete`}><i style={{ width: `${completion}%` }} /></div></div></td>
                    {onEdit && <td data-label="Actions"><div className="directory-actions"><button className="person-action" disabled={busy} onClick={() => onEdit(person)} aria-label={`Edit ${person.name}`}><Pencil size={13} />Edit</button><button className="person-action delete-action" disabled={busy} onClick={() => onDelete(person)} aria-label={`Delete ${person.name}`}><Trash2 size={13} />Delete</button></div></td>}
                </tr>)}</tbody>
            </table>
        </div>
        {results.total === 0 && <div className="directory-empty"><Users size={24} /><strong>No people in this selection</strong><span>Clear your filters or try another name.</span></div>}
        <footer className="directory-pagination"><span aria-live="polite">{results.total ? `${results.start + 1}–${results.start + results.rows.length} of ${results.total} ${results.total === 1 ? 'person' : 'people'}` : '0 people'}</span><div><label>Per page<select aria-label="People per page" value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))}><option value={10}>10</option><option value={20}>20</option></select></label><nav aria-label="Directory pages"><button className="icon-button" aria-label="Previous directory page" disabled={results.currentPage === 1} onClick={() => onPage(results.currentPage - 1)}><ChevronLeft size={18} /></button><span>Page {results.currentPage} of {results.pageCount}</span><button className="icon-button" aria-label="Next directory page" disabled={results.currentPage === results.pageCount} onClick={() => onPage(results.currentPage + 1)}><ChevronRight size={18} /></button></nav></div></footer>
    </section>;
}
