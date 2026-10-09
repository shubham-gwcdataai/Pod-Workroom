import { emailKey } from '../utils/hierarchy';
import { filterBranch } from '../utils/dashboard';

export function DateFilters({ from, to, onChange, label = 'Date' }) {
    return <div className="date-filters">
        <label>{label} from<input aria-label={`${label} from`} type="date" value={from || ''} max={to || undefined} onChange={(event) => onChange({ from: event.target.value })} /></label>
        <label>{label} to<input aria-label={`${label} to`} type="date" value={to || ''} min={from || undefined} onChange={(event) => onChange({ to: event.target.value })} /></label>
    </div>;
}

export function TeamFilters({ members, leadEmail, headEmail, onChange }) {
    const heads = filterBranch(members, leadEmail).filter((person) => person.role === 'team-head');
    return <div className="team-filters">
        {members.some((person) => person.role === 'team-lead') && <label>Team lead<select value={leadEmail || ''} onChange={(event) => onChange({ leadEmail: event.target.value, headEmail: '' })}><option value="">All leads</option>{members.filter((person) => person.role === 'team-lead').map((person) => <option key={person.email} value={emailKey(person.email)}>{person.name}</option>)}</select></label>}
        {heads.length > 0 && <label>Team head<select value={headEmail || ''} onChange={(event) => onChange({ headEmail: event.target.value })}><option value="">All heads</option>{heads.map((person) => <option key={person.email} value={emailKey(person.email)}>{person.name}</option>)}</select></label>}
    </div>;
}
