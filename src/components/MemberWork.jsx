import { useState } from 'react';
import { BriefcaseBusiness, CheckCheck, Clock3, FileText } from 'lucide-react';
import { PageIntro, StatCard, EmptyState } from './Shared';
import TaskDetails from './TaskDetails';
import { DateFilters } from './FilterControls';
import { localDate, weekRange, inDateRange, isOverdue, prettyDate } from '../utils/date';
import { emailKey } from '../utils/hierarchy';
import { hasOpenBlocker } from '../utils/dashboard';

export default function MemberWork({ user, tasks, updates = [], reportingManager, onStatusChange, onDailyUpdate, onNavigate, initialFilters = {}, busy }) {
    const [filters, setFilters] = useState({ from: '', to: '', overdue: false, ...initialFilters });
    const [details, setDetails] = useState(null);
    const today = localDate();
    const week = weekRange();
    const ownUpdates = updates.filter((update) => emailKey(update.memberEmail) === emailKey(user.email));
    const loggedToday = ownUpdates.some((update) => update.date === today);
    const open = tasks.filter((task) => task.status !== 'Complete');
    const completed = tasks.filter((task) => task.status === 'Complete');
    const weeklyCompleted = completed.filter((task) => inDateRange(task.completedAt, week.from, week.to));
    const overdue = open.filter((task) => isOverdue(task));
    const shown = open.filter((task) => (!filters.overdue || isOverdue(task)) && inDateRange(task.dueDate, filters.from, filters.to))
        .sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
    const change = (values) => setFilters((previous) => ({ ...previous, ...values }));
    return <div className="member-dashboard">
        <PageIntro eyebrow="YOUR POD DESK" title={`My work · ${user.name.split(' ')[0]}`} subtitle="Start with overdue work and assignments due today." actions={<button className="button-primary" onClick={onDailyUpdate}><FileText size={16} />{loggedToday ? 'Edit today’s check-in' : 'Log today’s check-in'}</button>} />
        <div className="personal-context"><span>Reports to <strong>{reportingManager?.name || (user.role === 'team-lead' ? 'POD admin' : 'Needs assignment')}</strong>{reportingManager?.email && ` · ${reportingManager.email}`}</span><span className={loggedToday ? 'check-in-done' : 'overdue-label'}>{loggedToday ? 'Today’s check-in saved' : 'Today’s check-in is missing'}</span></div>
        <div className="stats-grid">
            <button className="stat-link" aria-label={`Open assignments: ${open.length}`} onClick={() => change({ overdue: false, from: '', to: '' })}><StatCard label="Open assignments" value={open.length} note="All your active work" icon={BriefcaseBusiness} /></button>
            <button className="stat-link" aria-label={`Overdue: ${overdue.length}`} onClick={() => change({ overdue: true, from: '', to: '' })}><StatCard label="Overdue" value={overdue.length} note="Past the due date" icon={Clock3} tone="amber" /></button>
            <button className="stat-link" aria-label={`Completed this week: ${weeklyCompleted.length}`} onClick={() => onNavigate('history', week)}><StatCard label="Completed this week" value={weeklyCompleted.length} note="Monday through today" icon={CheckCheck} tone="blue" /></button>
            <StatCard label="Estimated remaining" value={`${open.reduce((sum, task) => sum + Number(task.hours || 0), 0)}h`} note="For your open assignments" icon={Clock3} />
        </div>
        <div className="report-filters"><DateFilters label="Due date" {...filters} onChange={change} /><label className="check-filter"><input type="checkbox" checked={Boolean(filters.overdue)} onChange={(event) => change({ overdue: event.target.checked })} />Overdue only</label><button className="button-secondary" onClick={() => change({ from: today, to: today, overdue: false })}>Due today</button><button className="button-secondary" onClick={() => change({ from: '', to: '', overdue: false })}>All open work</button></div>
        <section className="panel personal-task-list"><div className="panel-heading"><h2>Your priorities</h2><span>{shown.length} assignments</span></div>{shown.map((task) => <article className="personal-task" key={task.id}><div><button className="task-title-button" onClick={() => setDetails(task)}>{task.title}</button><p>{task.category} · {task.priority} priority</p><span className={isOverdue(task) ? 'overdue-label' : ''}>Due {prettyDate(task.dueDate)}{isOverdue(task) ? ' · Overdue' : ''}</span></div><select disabled={busy} aria-label={`Update status for ${task.title}`} value={task.status} onChange={(event) => onStatusChange(task.id, event.target.value)}><option>Not started</option><option>In progress</option><option>Complete</option></select></article>)}{shown.length === 0 && <EmptyState title="No work in this selection" detail="Choose another date or view all open assignments." />}</section>
        <section className="panel personal-blockers"><div className="panel-heading"><h2>Your blockers</h2><button className="text-link" onClick={onDailyUpdate}>Update check-in</button></div>{ownUpdates.filter(hasOpenBlocker).map((update) => <article key={update.id}><strong>{prettyDate(update.date)} · {update.blockers}</strong><p>{update.followUp ? `${update.followUpBy}: ${update.followUp}` : 'Awaiting team follow-up.'}</p>{update.escalatedTo && <span>Escalated to {update.escalatedTo}</span>}</article>)}{!ownUpdates.some(hasOpenBlocker) && <p>No unresolved blockers.</p>}</section>
        <p className="completion-note">All-time completion: {tasks.length ? Math.round(completed.length / tasks.length * 100) : 0}% · {completed.length} completed assignments</p>
        {details && <TaskDetails task={details} members={[user]} onClose={() => setDetails(null)} />}
    </div>;
}
