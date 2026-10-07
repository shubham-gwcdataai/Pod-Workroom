import { Clock3, ClipboardList } from "lucide-react";
import { prettyDate } from "../utils/date";

export function PageIntro({ eyebrow, title, subtitle, actions }) {
    return (
        <div className="page-intro">
            <div>
                <div className="section-eyebrow">{eyebrow}</div>
                <h1>{title}</h1>
                <p>{subtitle}</p>
            </div>
            {actions && <div className="intro-actions">{actions}</div>}
        </div>
    );
}



export function StatCard({ label, value, note, icon: Icon, tone = "mint" }) {
    return (
        <article className={`stat-card tone-${tone}`}>
            <div className="stat-card-top">
                <span>{label}</span>
                <span className="stat-icon">
                    <Icon size={17} />
                </span>
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-foot">
                <span className="stat-description">{note}</span>
            </div>
        </article>
    );
}



export function AssignmentRow({ task, member }) {
    return (
        <div className="assignment-row">
            <div className="assignment-state">
                <span
                    className={`status-marker ${
                        task.status === "In progress"
                            ? "marker-progress"
                            : "marker-not-started"
                    }`}
                />
            </div>
            <div className="assignment-copy">
                <strong>{task.title}</strong>
                <span>
                    {task.category} <b>·</b> {member?.name || "Unassigned"}
                </span>
            </div>
            <span
                className={`priority priority-${task.priority?.toLowerCase()}`}
            >
                {task.priority}
            </span>
            <span className="assignment-date">
                <Clock3 size={13} /> {prettyDate(task.dueDate)}
            </span>
        </div>
    );
}



export function DailyUpdateSummary({ update }) {
    const hasBlocker = update.blockerStatus === "Not solved" &&
        update.blockers?.trim();
    return (
        <article className="daily-summary-row">
            <span className="daily-summary-date">
                {prettyDate(update.date)}
            </span>
            <span className="daily-summary-person">{update.name}</span>
            <span className="daily-summary-activity">
                {update.todayActivity}
            </span>
            <span
                className={`blocker-pill ${
                    hasBlocker
                        ? "blocker-open"
                        : update.blockerStatus === "Solved"
                        ? "blocker-solved"
                        : "blocker-clear"
                }`}
            >
                {hasBlocker ? "Blocker" : update.blockerStatus}
            </span>
        </article>
    );
}



export function MemberTaskRow({ task, onStatusChange }) {
    return (
        <article className="member-task-row">
            <span
                className={`task-check ${
                    task.status === "In progress" ? "task-check-progress" : ""
                }`}
            />{" "}
            <div className="member-task-copy">
                <strong>{task.title}</strong>
                <span>
                    {task.category} <b>·</b> Due {prettyDate(task.dueDate)}
                </span>
            </div>
            <span
                className={`priority priority-${task.priority?.toLowerCase()}`}
            >
                {task.priority}
            </span>
            <select
                aria-label={`Update status for ${task.title}`}
                value={task.status}
                onChange={(event) =>
                    onStatusChange(task.id, event.target.value)}
            >
                <option>Not started</option>
                <option>In progress</option>
                <option>Complete</option>
            </select>
        </article>
    );
}



export function EmptyState({ title, detail }) {
    return (
        <div className="empty-state">
            <span>
                <ClipboardList size={20} />
            </span>
            <strong>{title}</strong>
            <p>{detail}</p>
        </div>
    );
}


