import { useState } from 'react';
import { PageIntro, EmptyState } from './Shared';
import { DateFilters } from './FilterControls';
import { inDateRange, localDate } from '../utils/date';

export default function ActivityHistory({ activity = [] }) {
    const [search, setSearch] = useState('');
    const [range, setRange] = useState({ from: '', to: '' });
    const filtered = activity.filter((event) => `${event.action} ${event.target} ${event.actor} ${event.details}`.toLowerCase().includes(search.toLowerCase()) && inDateRange(localDate(new Date(event.at)), range.from, range.to));
    return <><PageIntro eyebrow="ADMIN RECORDS" title="Activity history" subtitle="Recent person, role, and assignment changes recorded by the app." />
        <div className="report-filters"><label className="search-field"><input aria-label="Search activity" placeholder="Search people or changes" value={search} onChange={(event) => setSearch(event.target.value)} /></label><DateFilters label="Activity date" {...range} onChange={(change) => setRange((previous) => ({ ...previous, ...change }))} /></div>
        <section className="panel activity-list">{filtered.map((event) => <article key={event.id}><div><strong>{event.action} · {event.target}</strong><p>{event.details}</p></div><span>{event.actor}<br />{new Date(event.at).toLocaleString()}</span></article>)}{filtered.length === 0 && <EmptyState title="No matching activity" detail="New changes will be recorded here. Earlier changes are not backfilled." />}</section>
    </>;
}
