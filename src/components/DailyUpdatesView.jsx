import { useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import { prettyDate } from "../utils/date";
import { EmptyState, PageIntro } from "./Shared";

export default function DailyUpdatesView({ updates }) {
    const [search, setSearch] = useState("");
    const filtered = updates.filter((update) =>
        `${update.name} ${update.yesterdayActivity} ${update.todayActivity} ${update.blockers}`
            .toLowerCase().includes(search.toLowerCase())
    );
    const openCount =
        updates.filter((update) =>
            update.blockerStatus === "Not solved" && update.blockers?.trim()
        ).length;
    return (
        <>
            <PageIntro
                eyebrow="TEAM REPORTING"
                title="Daily check-ins"
                subtitle="The POD’s yesterday, today, and any blockers that need attention."
                actions={
                    <span className="updates-date">
                        <CalendarDays size={14} />{" "}
                        {new Intl.DateTimeFormat("en", { dateStyle: "medium" })
                            .format(new Date())}
                    </span>
                }
            />
            <section className="daily-report-stats">
                <article>
                    <span>Reports logged</span>
                    <strong>{updates.length}</strong>
                </article>
                <article className={openCount ? "report-stat-alert" : ""}>
                    <span>Unresolved blockers</span>
                    <strong>{openCount}</strong>
                </article>
                <label className="search-field">
                    <Search size={16} />
                    <input
                        aria-label="Search daily updates"
                        placeholder="Search the daily log"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </label>
            </section>
            <section className="daily-table-wrap panel">
                <table className="daily-table">
                    <thead>
                        <tr>
                            <th>DATE</th>
                            <th>NAME</th>
                            <th>YESTERDAY’S ACTIVITY</th>
                            <th>TODAY’S ACTIVITY</th>
                            <th>BLOCKERS</th>
                            <th>SOLVED / NOT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((update) => (
                            <tr key={update.id}>
                                <td>{prettyDate(update.date)}</td>
                                <td>
                                    <strong>{update.name}</strong>
                                </td>
                                <td>{update.yesterdayActivity}</td>
                                <td>{update.todayActivity}</td>
                                <td
                                    className={update.blockerStatus ===
                                            "Not solved"
                                        ? "blocker-cell-open"
                                        : ""}
                                >
                                    {update.blockers?.trim() || "None"}
                                </td>
                                <td>
                                    <span
                                        className={`blocker-pill ${
                                            update.blockerStatus ===
                                                    "Not solved"
                                                ? "blocker-open"
                                                : update.blockerStatus ===
                                                        "Solved"
                                                ? "blocker-solved"
                                                : "blocker-clear"
                                        }`}
                                    >
                                        {update.blockerStatus}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <EmptyState
                        title="No matching check-ins"
                        detail="Try another name or activity."
                    />
                )}
            </section>
        </>
    );
}


