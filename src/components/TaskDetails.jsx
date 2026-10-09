import { X } from 'lucide-react';
import { prettyDate } from '../utils/date';

export default function TaskDetails({ task, members, onClose }) {
    const owner = members.find((person) => person.email === task.memberEmail);
    return <div className="modal-backdrop" onMouseDown={onClose}>
        <section className="task-dialog" role="dialog" aria-modal="true" aria-labelledby="task-details-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><h2 id="task-details-title">{task.title}</h2><button autoFocus className="icon-button" onClick={onClose} aria-label="Close task details"><X size={18} /></button></header>
            <dl className="task-detail-list"><dt>Owner</dt><dd>{owner?.name || task.memberEmail || 'Unassigned'}</dd><dt>Workstream</dt><dd>{task.category}</dd><dt>Priority</dt><dd>{task.priority}</dd><dt>Status</dt><dd>{task.status}</dd><dt>Due</dt><dd>{prettyDate(task.dueDate)}</dd><dt>Assigned</dt><dd>{task.assignedAt ? prettyDate(task.assignedAt) : 'Not recorded'}</dd><dt>Completed</dt><dd>{task.completedAt ? prettyDate(task.completedAt) : 'Not recorded'}</dd><dt>Estimated hours</dt><dd>{task.hours || 0}</dd></dl>
        </section>
    </div>;
}
