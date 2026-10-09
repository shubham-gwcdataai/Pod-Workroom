import { useState } from 'react';
import { Check } from 'lucide-react';
import { prettyDate, inDateRange } from '../utils/date';
import { EmptyState, PageIntro } from './Shared';
import { DateFilters } from './FilterControls';
import TaskDetails from './TaskDetails';

export default function MemberHistory({ tasks, initialFilters = {}, user }) {
    const [search, setSearch] = useState('');
    const [range, setRange] = useState({ from: '', to: '', ...initialFilters });
    const [details, setDetails] = useState(null);
    const filtered = tasks.filter((task) => `${task.title} ${task.category}`.toLowerCase().includes(search.toLowerCase()) && inDateRange(task.completedAt, range.from, range.to));
    return <><PageIntro eyebrow="YOUR POD DESK" title="Completed work" subtitle="Search your completed assignments or filter by completion date." />
        <div className="report-filters"><label className="search-field"><input aria-label="Search completed work" placeholder="Search title or workstream" value={search} onChange={(event) => setSearch(event.target.value)} /></label><DateFilters label="Completion date" {...range} onChange={(change) => setRange((previous) => ({ ...previous, ...change }))} /><button className="button-secondary" onClick={() => setRange({ from: '', to: '' })}>All dates</button></div>
        <p className="filter-context">{filtered.length} completed assignments in this selection</p>
        <div className="history-list">{filtered.map((task) => <article className="history-row" key={task.id}><span className="history-row-check"><Check size={15} /></span><div><button className="task-title-button" onClick={() => setDetails(task)}>{task.title}</button><span>{task.category} · {task.completedAt ? prettyDate(task.completedAt) : 'Completion date not recorded'}</span></div><span className="complete-label">Complete</span></article>)}{filtered.length === 0 && <EmptyState title="No completed work in this selection" detail="Try another date range or search term." />}</div>
        {details && <TaskDetails task={details} members={[user]} onClose={() => setDetails(null)} />}
    </>;
}
