import { ArrowRight, Plus, UserPlus, Clock3 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildWeekData } from "../utils/date";
import { AssignmentRow, DailyUpdateSummary, EmptyState, PageIntro } from "./Shared";

import { TeamSummary } from "./TeamOverview";
import { isOverdue } from '../utils/date';

const STATUS_COLORS = { Complete: "#4d9c7c", "In progress": "#e0a44f", "Not started": "#c7d0d4" };

export default function AdminOverview({ workspace, counts, onNewTask, onAddPerson, onNavigate }) {
    const overdue = workspace.tasks.filter((task) => isOverdue(task)).length;
    const completed = counts.Complete || 0;
    const completion = workspace.tasks.length ? Math.round(completed / workspace.tasks.length * 100) : 0;
    const chartData = [
        {
            name: "Complete",
            value: counts.Complete || 0,
            color: STATUS_COLORS.Complete,
        },
        {
            name: "In progress",
            value: counts["In progress"] || 0,
            color: STATUS_COLORS["In progress"],
        },
        {
            name: "Not started",
            value: counts["Not started"] || 0,
            color: STATUS_COLORS["Not started"],
        },
    ];
    const weeklyData = buildWeekData(workspace.tasks);
    const activeTasks = workspace.tasks.filter((task) =>
        task.status !== "Complete"
    ).slice(0, 4);
    const latestUpdates = workspace.dailyUpdates.slice(0, 3);
    return (
        <>
            <PageIntro
                eyebrow={`${
                    new Intl.DateTimeFormat("en", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                    }).format(new Date()).toUpperCase()
                } · TEAM OVERVIEW`}
                title="Team overview"
                subtitle="Your teams, reporting lines, and work progress in one place."
                actions={
                    <button className="button-primary" onClick={onNewTask}>
                        <Plus size={17} /> New assignment
                    </button>
                }
            />
            <section className="admin-command-panel" aria-label="Workspace actions">
                <div className="command-copy"><span className="panel-overline">WORKSPACE AT A GLANCE</span><h2>{workspace.members.length} people. One shared workspace.</h2><p>{completed} of {workspace.tasks.length} assignments complete · {completion}% completion</p><div className="command-progress" role="progressbar" aria-label="Assignment completion" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${completion}%` }} /></div></div>
                <div className="command-actions"><button className="button-secondary" onClick={onAddPerson}><UserPlus size={17} />Add a person</button><button className="button-secondary" onClick={() => onNavigate('work', { overdue: true })}><Clock3 size={17} />{overdue} overdue<ArrowRight size={15} /></button></div>
            </section>
            <TeamSummary workspace={workspace} user={{ role: "admin" }} onNavigate={onNavigate} />
            <section className="analytics-grid">
                <article className="panel throughput-panel">
                    <div className="panel-heading">
                        <div>
                            <span className="panel-overline">
                                TEAM ACTIVITY
                            </span>
                            <h2>Daily throughput</h2>
                        </div>
                        <span className="chart-period">Last 7 days</span>
                    </div>
                    <div className="chart-legend">
                        <span>
                            <i className="legend-dot legend-closed" />{" "}
                            Work completed
                        </span>
                        <span>
                            <i className="legend-dot legend-assigned" />{" "}
                            Work assigned
                        </span>
                    </div>
                    <div className="throughput-chart">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={weeklyData}
                                margin={{
                                    top: 8,
                                    right: 8,
                                    left: -20,
                                    bottom: 0,
                                }}
                            >
                                <defs>
                                    <linearGradient
                                        id="closedFill"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="0%"
                                            stopColor="#4d9c7c"
                                            stopOpacity={0.2}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="#4d9c7c"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                    <linearGradient
                                        id="assignedFill"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="0%"
                                            stopColor="#7b9ebb"
                                            stopOpacity={0.14}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="#7b9ebb"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    vertical={false}
                                    stroke="#e9eeeb"
                                    strokeDasharray="3 5"
                                />
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#89968f", fontSize: 11 }}
                                    dy={9}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#89968f", fontSize: 11 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        border: "1px solid #e4e9e6",
                                        borderRadius: 8,
                                        fontSize: 12,
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="assigned"
                                    name="Work assigned"
                                    stroke="#86a5bc"
                                    strokeWidth={2}
                                    fill="url(#assignedFill)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="closed"
                                    name="Work completed"
                                    stroke="#4d9c7c"
                                    strokeWidth={2.5}
                                    fill="url(#closedFill)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </article>
                <article className="panel status-panel">
                    <div className="panel-heading">
                        <div>
                            <span className="panel-overline">WORK STATUS</span>
                            <h2>Where things stand</h2>
                        </div>
                        <button
                            className="icon-button panel-more"
                            title="Open work queue"
                            aria-label="Open work queue"
                            onClick={() => onNavigate("work")}
                        >
                            <ArrowRight size={17} />
                        </button>
                    </div>
                    <div className="status-chart-wrap">
                        <div className="status-chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius="70%"
                                        outerRadius="92%"
                                        paddingAngle={4}
                                        stroke="none"
                                    >
                                        {chartData.map((item) => (
                                            <Cell
                                                key={item.name}
                                                fill={item.color}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="donut-total">
                                <strong>{workspace.tasks.length}</strong>
                                <span>items</span>
                            </div>
                        </div>
                    </div>
                    <div className="status-legend">
                        {chartData.map((item) => (
                            <button key={item.name} onClick={() => onNavigate('work', { status: item.name })} aria-label={`View ${item.value} ${item.name.toLowerCase()} assignments`}>
                                <span>
                                    <i style={{ background: item.color }} />
                                    {item.name}
                                </span>
                                <strong>{item.value}</strong>
                            </button>
                        ))}
                    </div>
                </article>
            </section>
            <section className="bottom-grid">
                <article className="panel attention-panel">
                    <div className="panel-heading">
                        <div>
                            <span className="panel-overline">
                                NEEDS ATTENTION
                            </span>
                            <h2>Active assignments</h2>
                        </div>
                        <button
                            className="text-link"
                            onClick={() => onNavigate("work")}
                        >
                            View queue <ArrowRight size={14} />
                        </button>
                    </div>
                    <div className="assignment-list">
                        {activeTasks.map((task) => (
                            <AssignmentRow
                                key={task.id}
                                task={task}
                                member={workspace.members.find((item) =>
                                    item.email === task.memberEmail
                                )}
                            />
                        ))}
                        {activeTasks.length === 0 && (
                            <EmptyState
                                title="All caught up"
                                detail="There are no active assignments right now."
                            />
                        )}
                    </div>
                </article>
            </section>
            <section className="panel daily-overview">
                <div className="panel-heading">
                    <div>
                        <span className="panel-overline">DAILY POD LOG</span>
                        <h2>Latest check-ins</h2>
                    </div>
                    <button
                        className="text-link"
                        onClick={() => onNavigate("updates")}
                    >
                        All updates <ArrowRight size={14} />
                    </button>
                </div>
                <div className="daily-overview-list">
                    {latestUpdates.map((update) => (
                        <DailyUpdateSummary key={update.id} update={update} />
                    ))}
                    {latestUpdates.length === 0 && (
                        <EmptyState
                            title="No check-ins yet"
                            detail="Member daily updates will appear here."
                        />
                    )}
                </div>
            </section>
        </>
    );
}
