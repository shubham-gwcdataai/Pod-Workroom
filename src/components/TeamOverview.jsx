import { useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, ClipboardList, Clock3, FileText, TriangleAlert } from 'lucide-react';
import { PageIntro, StatCard } from './Shared';
import { DateFilters, TeamFilters } from './FilterControls';
import { branchEmails, filterBranch, summarize } from '../utils/dashboard';
import { emailKey, roleLabels } from '../utils/hierarchy';
import { localDate, weekRange } from '../utils/date';
import { directoryPage } from '../utils/directory';

export function TeamSummary({ workspace, user, onNavigate }) {
    const [filters, setFilters] = useState({ ...weekRange(), leadEmail: '', headEmail: '' });
    const [page, setPage] = useState(1);
    const selected = filterBranch(workspace.members, filters.leadEmail, filters.headEmail);
    const stats = summarize(selected, workspace.tasks, workspace.dailyUpdates, filters, localDate(), user.role === 'admin' && !filters.leadEmail && !filters.headEmail);
    const role = filters.headEmail ? 'team-head' : user.role === 'admin' ? 'team-lead' : user.role === 'team-lead' ? 'team-head' : 'team-member';
    const roots = selected.filter((person) => person.role === role);
    const cardPage = directoryPage(roots.map((person) => ({ person })), { page, pageSize: 6 });
    const baseFilters = { leadEmail: filters.leadEmail, headEmail: filters.headEmail };
    const change = (changes) => { setFilters((previous) => ({ ...previous, ...changes })); setPage(1); };
    const tiles = [
        { label: 'Open work', value: stats.open, note: 'All active assignments', icon: ClipboardList, view: 'work', filters: { status: 'Open' } },
        { label: 'Overdue', value: stats.overdue, note: 'Past the due date', icon: Clock3, view: 'work', filters: { overdue: true }, tone: 'amber' },
        { label: 'Open blockers', value: stats.blockers, note: 'All unresolved issues', icon: TriangleAlert, view: 'updates', filters: { blockers: true }, tone: 'rose' },
        { label: 'Missing check-ins', value: stats.missing, note: 'For today', icon: FileText, view: 'updates', filters: { missing: true, date: localDate() }, tone: 'blue' },
    ];
    return <section className="team-summary">
        <div className="report-filters"><TeamFilters members={workspace.members} {...filters} onChange={change} /><DateFilters label="Completion date" {...filters} onChange={change} /><button className="button-secondary" onClick={() => change(weekRange())}>This week</button></div>
        <div className="stats-grid">{tiles.map((tile) => <button className="stat-link" key={tile.label} aria-label={`${tile.label}: ${tile.value}. ${tile.note}`} onClick={() => onNavigate(tile.view, { ...baseFilters, ...tile.filters })}><StatCard {...tile} /></button>)}</div>
        <div className="panel-heading summary-heading"><div><span className="panel-overline">{roleLabels[role]?.toUpperCase()}S</span><h2>{role === 'team-lead' ? 'Teams by lead' : role === 'team-head' ? 'Teams by head' : 'Member workload'}</h2></div><span>{stats.complete} completed in selected dates</span></div>
        <div className="summary-card-grid">{cardPage.rows.map(({ person }) => {
            const emails = branchEmails(workspace.members, person.email);
            const branch = workspace.members.filter((member) => emails.has(emailKey(member.email)));
            const metrics = summarize(branch, workspace.tasks, workspace.dailyUpdates, filters);
            const personFilters = person.role === 'team-lead' ? { leadEmail: person.email } : person.role === 'team-head' ? { headEmail: person.email } : { ownerEmail: person.email };
            return <article className="panel branch-summary" key={person.email}>
                <div className="panel-heading"><div><h3>{person.name}</h3><p>{person.title || roleLabels[person.role]}</p></div><button className="icon-button" aria-label={`View ${person.name}’s team`} onClick={() => onNavigate('team', personFilters)}><ArrowRight size={18} /></button></div>
                {person.role !== 'team-member' && <p className="branch-counts">{metrics.heads} {metrics.heads === 1 ? 'head' : 'heads'} · {metrics.members} {metrics.members === 1 ? 'member' : 'members'}</p>}
                <div className="branch-metrics">
                    <button onClick={() => onNavigate('work', { ...personFilters, status: 'Open' })}><strong>{metrics.open}</strong>Open work</button>
                    <button onClick={() => onNavigate('work', { ...personFilters, overdue: true })}><strong>{metrics.overdue}</strong>Overdue</button>
                    <button onClick={() => onNavigate('updates', { ...personFilters, blockers: true })}><strong>{metrics.blockers}</strong>Blockers</button>
                    <button onClick={() => onNavigate('updates', { ...personFilters, missing: true, date: localDate() })}><strong>{metrics.missing}</strong>Missing today</button>
                </div>
                <footer>{metrics.complete} completed in selected dates</footer>
            </article>;
        })}</div>
        {cardPage.pageCount > 1 && <nav className="directory-pagination summary-pagination" aria-label="Team summary pages"><span>{cardPage.start + 1}–{cardPage.start + cardPage.rows.length} of {cardPage.total} {role === 'team-member' ? 'members' : 'teams'}</span><div><button className="icon-button" aria-label="Previous team summary page" disabled={cardPage.currentPage === 1} onClick={() => setPage(cardPage.currentPage - 1)}><ChevronLeft size={18} /></button><span>Page {cardPage.currentPage} of {cardPage.pageCount}</span><button className="icon-button" aria-label="Next team summary page" disabled={cardPage.currentPage === cardPage.pageCount} onClick={() => setPage(cardPage.currentPage + 1)}><ChevronRight size={18} /></button></div></nav>}
        {roots.length === 0 && <p className="hierarchy-empty">No {roleLabels[role]?.toLowerCase()}s in this selection.</p>}
        {user.role === 'admin' && <button className="text-link summary-directory" onClick={() => onNavigate('team')}>Manage all people and unassigned teams <ArrowRight size={15} /></button>}
    </section>;
}

export default function TeamOverview({ workspace, user, onNavigate }) {
    return <>
        <PageIntro eyebrow={user.role === 'team-lead' ? 'TEAM LEAD WORKSPACE' : 'TEAM HEAD WORKSPACE'} title={user.role === 'team-lead' ? 'Lead overview' : 'Head overview'} subtitle={user.role === 'team-lead' ? 'Review your heads, their teams, and issues that need your support.' : 'Track your members’ workload, daily check-ins, and blockers.'} actions={<button className="button-secondary" onClick={() => onNavigate('my-work')}>My own assignments</button>} />
        {workspace.reportingManager && <p className="reporting-line">Reports to <strong>{workspace.reportingManager.name}</strong> · {roleLabels[workspace.reportingManager.role]}</p>}
        <TeamSummary workspace={workspace} user={user} onNavigate={onNavigate} />
    </>;
}
