import { useState } from "react";
import { Filter, Plus, Search } from "lucide-react";
import { initials, prettyDate } from "../utils/date";
import { EmptyState, PageIntro } from "./Shared";

export default function WorkQueue({ tasks, members, onStatusChange, onNewTask }) {
    const [filter, setFilter] = useState("All work");
    const [search, setSearch] = useState("");
    const filtered = tasks.filter((task) =>
        (filter === "All work" || task.status === filter) &&
        `${task.title} ${task.category} ${task.memberEmail}`.toLowerCase()
            .includes(search.toLowerCase())
    );
    return (
        <>
            <PageIntro
                eyebrow="POD OPERATIONS"
                title="Work queue"
                subtitle="Keep ownership, priorities, and handoffs in one place."
                actions={
                    <button className="button-primary" onClick={onNewTask}>
                        <Plus size={17} /> New assignment
                    </button>
                }
            />
            <section className="queue-panel panel">
                <div className="queue-toolbar">
                    <div className="filter-tabs">
                        {["All work", "Not started", "In progress", "Complete"]
                            .map((item) => (
                                <button
                                    key={item}
                                    onClick={() => setFilter(item)}
                                    className={filter === item
                                        ? "selected"
                                        : ""}
                                >
                                    {item}
                                    {item === "All work" && (
                                        <span>{tasks.length}</span>
                                    )}
                                </button>
                            ))}
                    </div>
                    <div className="queue-tools">
                        <label className="search-field">
                            <Search size={16} />
                            <input
                                aria-label="Search assignments"
                                placeholder="Find an assignment"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)}
                            />
                        </label>
                        <button
                            className="icon-button filter-button"
                            aria-label="Filter assignments"
                            title="Filter assignments"
                        >
                            <Filter size={16} />
                        </button>
                    </div>
                </div>
                <div className="queue-table-wrap">
                    <table className="queue-table">
                        <thead>
                            <tr>
                                <th>ASSIGNMENT</th>
                                <th>OWNER</th>
                                <th>PRIORITY</th>
                                <th>DUE DATE</th>
                                <th>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((task) => {
                                const owner = members.find((member) =>
                                    member.email === task.memberEmail
                                );
                                return (
                                    <tr key={task.id}>
                                        <td>
                                            <strong>{task.title}</strong>
                                            <small>{task.category}</small>
                                        </td>
                                        <td>
                                            <span className="owner-cell">
                                                <span
                                                    className="avatar avatar-small"
                                                    style={{
                                                        background:
                                                            owner?.color ||
                                                            "#e3ebe5",
                                                    }}
                                                >
                                                    {owner?.initials ||
                                                        initials(owner?.name)}
                                                </span>
                                                {owner?.name || "Unassigned"}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`priority priority-${task.priority?.toLowerCase()}`}
                                            >
                                                {task.priority}
                                            </span>
                                        </td>
                                        <td>{prettyDate(task.dueDate)}</td>
                                        <td>
                                            <select
                                                className={`status-select status-${
                                                    task.status.toLowerCase()
                                                        .replace(" ", "-")
                                                }`}
                                                aria-label={`Status for ${task.title}`}
                                                value={task.status}
                                                onChange={(event) =>
                                                    onStatusChange(
                                                        task.id,
                                                        event.target.value,
                                                    )}
                                            >
                                                <option>Not started</option>
                                                <option>In progress</option>
                                                <option>Complete</option>
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <EmptyState
                            title="No matching assignments"
                            detail="Try another status or search term."
                        />
                    )}
                </div>
                <div className="queue-foot">
                    <span>
                        Showing {filtered.length} of {tasks.length} assignments
                    </span>
                    <span>
                        <i className="live-dot" /> Changes save automatically
                    </span>
                </div>
            </section>
        </>
    );
}


