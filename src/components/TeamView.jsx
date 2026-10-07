import { useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { PageIntro } from './Shared';
import TeamHierarchy from './TeamHierarchy';
import { emailKey, roleLabels } from '../utils/hierarchy';

export default function TeamView({ members, tasks, currentUser, canManage, onAddMember, onEditRole, onDeleteMember, busy }) {
    const [search, setSearch] = useState('');
    const [toDelete, setToDelete] = useState(null);
    const [error, setError] = useState('');
    const reportCount = toDelete ? members.filter((person) => emailKey(person.managerEmail) === emailKey(toDelete.email)).length : 0;
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
            actions={canManage && <button className="button-primary" onClick={onAddMember}><Plus size={16} /> Add person</button>} />
        <div className="team-toolbar">
            <div className="team-role-counts">{Object.entries(roleLabels).map(([role, label]) => <span key={role}><strong>{members.filter((person) => person.role === role).length}</strong> {label}s</span>)}</div>
            <label className="search-field"><Search size={16} /><input aria-label="Search people" placeholder="Search name, email, or role" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div>
        <TeamHierarchy members={members} tasks={tasks} rootEmail={canManage ? undefined : currentUser.email} search={search} busy={busy} onEdit={canManage ? onEditRole : undefined} onDelete={canManage ? (person) => { setToDelete(person); setError(''); } : undefined} />
            <section className="panel team-work-panel">
                <div className="panel-heading">
                    <div>
                        <span className="panel-overline">CAPACITY</span>
                        <h2>Assignments by owner</h2>
                    </div>
                    <span className="capacity-key">
                        <i /> Active work
                    </span>
                </div>
                {members.map((member) => {
                    const count = tasks.filter((task) =>
                        task.memberEmail === member.email &&
                        task.status !== "Complete"
                    ).length;
                    return (
                        <div className="capacity-row" key={member.email}>
                            <span>{member.name}</span>
                            <div className="capacity-track">
                                <i
                                    style={{
                                        width: `${
                                            count / Math.max(tasks.length, 1) * 100
                                        }%`,
                                    }}
                                />
                            </div>
                            <strong>{count}</strong>
                        </div>
                    );
                })}
            </section>
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
