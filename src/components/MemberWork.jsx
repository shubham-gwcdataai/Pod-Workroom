import { Activity, ArrowRight, BriefcaseBusiness, Check, CheckCheck, CircleHelp, Clock3, FileText } from "lucide-react";
import { initials, prettyDate } from "../utils/date";
import { EmptyState, MemberTaskRow } from "./Shared";

export default function MemberWork({ user, tasks, onStatusChange, onDailyUpdate }) {
    const open = tasks.filter((task) => task.status !== "Complete");
    const completed = tasks.filter((task) => task.status === "Complete").length;
    const nextTask = open.find((task) => task.status === "In progress") ||
        open[0];
    return (
        <div className="member-dashboard">
            <section className="member-welcome">
                <div>
                    <div className="member-date">
                        <span className="welcome-spark">✳</span> YOUR POD DESK
                        {" "}
                        <span className="welcome-line" />{" "}
                        {new Intl.DateTimeFormat("en", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                        }).format(new Date()).toUpperCase()}
                    </div>
                    <h1>
                        Good morning,<br />
                        <em>{user.name.split(" ")[0]}.</em>
                    </h1>
                    <p>Steady progress adds up. Here’s your work for today.</p>
                </div>
                <div className="welcome-illustration" aria-hidden="true">
                    <div className="illustration-paper">
                        <span />
                        <span />
                        <span />
                        <i>
                            <Check size={16} />
                        </i>
                    </div>
                    <div className="illustration-stamp">
                        POD<br />ON IT
                    </div>
                    <span className="illustration-sun" />
                </div>
            </section>
            <section className="member-quick-stats">
                <article>
                    <span className="quick-stat-icon quick-green">
                        <BriefcaseBusiness size={17} />
                    </span>
                    <div>
                        <strong>
                            {open.length.toString().padStart(2, "0")}
                        </strong>
                        <span>Open assignments</span>
                    </div>
                </article>
                <article>
                    <span className="quick-stat-icon quick-blue">
                        <CheckCheck size={17} />
                    </span>
                    <div>
                        <strong>{completed.toString().padStart(2, "0")}</strong>
                        <span>Completed this week</span>
                    </div>
                </article>
                <article>
                    <span className="quick-stat-icon quick-orange">
                        <Clock3 size={17} />
                    </span>
                    <div>
                        <strong>
                            {tasks.reduce(
                                (hours, task) =>
                                    hours + (task.status !== "Complete"
                                        ? Number(task.hours || 0)
                                        : 0),
                                0,
                            )}
                            <small>h</small>
                        </strong>
                        <span>Estimated remaining</span>
                    </div>
                </article>
            </section>
            <section className="member-task-layout">
                <div className="member-main-tasks">
                    <div className="member-section-head">
                        <div>
                            <span className="member-overline">
                                YOUR PRIORITIES
                            </span>
                            <h2>
                                On your plate <span>{open.length}</span>
                            </h2>
                        </div>
                        <button
                            className="button-secondary daily-log-action"
                            onClick={onDailyUpdate}
                        >
                            <FileText size={15} /> Log today
                        </button>
                    </div>
                    {nextTask && (
                        <article className="focus-task">
                            <div className="focus-task-top">
                                <span className="focus-tag">
                                    <i /> CURRENT FOCUS
                                </span>
                                <span
                                    className={`priority priority-${nextTask.priority?.toLowerCase()}`}
                                >
                                    {nextTask.priority} priority
                                </span>
                            </div>
                            <h3>{nextTask.title}</h3>
                            <p>
                                {nextTask.category} <b>·</b> Due{" "}
                                {prettyDate(nextTask.dueDate)}
                            </p>
                            <div className="focus-task-bottom">
                                <div className="focus-owner">
                                    <span
                                        className="avatar avatar-small"
                                        style={{
                                            background: user.color || "#dcefe7",
                                        }}
                                    >
                                        {initials(user.name)}
                                    </span>{" "}
                                    Assigned to you
                                </div>
                                <select
                                    aria-label={`Update status for ${nextTask.title}`}
                                    value={nextTask.status}
                                    onChange={(event) =>
                                        onStatusChange(
                                            nextTask.id,
                                            event.target.value,
                                        )}
                                >
                                    <option>Not started</option>
                                    <option>In progress</option>
                                    <option>Complete</option>
                                </select>
                            </div>
                        </article>
                    )}
                    <div className="task-list">
                        {open.filter((task) => task.id !== nextTask?.id).map((
                            task,
                        ) => (
                            <MemberTaskRow
                                key={task.id}
                                task={task}
                                onStatusChange={onStatusChange}
                            />
                        ))}
                        {open.length === 0 && (
                            <EmptyState
                                title="You’re all caught up"
                                detail="New assignments from your admin will show here."
                            />
                        )}
                    </div>
                </div>
                <aside className="member-side-column">
                    <article className="week-card">
                        <div className="week-card-head">
                            <div>
                                <span className="member-overline">
                                    THIS WEEK
                                </span>
                                <h2>Your momentum</h2>
                            </div>
                            <span className="week-icon">
                                <Activity size={17} />
                            </span>
                        </div>
                        <div className="week-score">
                            <strong>
                                {tasks.length
                                    ? Math.round(completed / tasks.length * 100)
                                    : 0}
                                <small>%</small>
                            </strong>
                            <span>
                                of your assignments<br />are complete
                            </span>
                        </div>
                        <div className="week-progress">
                            <span
                                style={{
                                    width: `${
                                        tasks.length
                                            ? completed / tasks.length * 100
                                            : 0
                                    }%`,
                                }}
                            />
                        </div>
                        <div className="week-foot">
                            <span>{completed} completed</span>
                            <span>{open.length} to go</span>
                        </div>
                        <div className="week-divider" />
                        <div className="weekly-quote">
                            <span>“</span>
                            <p>
                                Small steps, done consistently, make the big
                                work feel lighter.
                            </p>
                        </div>
                    </article>
                    <article className="member-help">
                        <span className="help-icon">
                            <CircleHelp size={18} />
                        </span>
                        <div>
                            <strong>Need a hand?</strong>
                            <p>
                                Reach out to your POD admin if priorities need a
                                reset.
                            </p>
                        </div>
                        <ArrowRight size={16} />
                    </article>
                </aside>
            </section>
        </div>
    );
}


