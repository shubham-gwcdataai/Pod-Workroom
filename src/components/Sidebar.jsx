import { ArrowUpRight, BriefcaseBusiness, CheckCheck, ClipboardList, FileText, LayoutDashboard, LogOut, Settings2, ShieldCheck, Users } from "lucide-react";
import { initials } from "../utils/date";

export default function Sidebar({ user, isAdmin, activeView, workspace, mobileNav, onNavigate, onCloseMobile, onSignOut }) {
    const myTasks = workspace.tasks.filter((task) => task.memberEmail === user.email);
    const canViewTeam = isAdmin || user.role === "team-head" || user.role === "team-lead";
    const navItems = isAdmin ? [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "work", label: "Work queue", icon: ClipboardList, badge: workspace.tasks.filter((task) => task.status !== "Complete").length },
        { id: "updates", label: "Daily check-ins", icon: FileText, badge: workspace.dailyUpdates.filter((update) => update.blockerStatus === "Not solved").length },
        { id: "team", label: "POD members", icon: Users },
    ] : canViewTeam ? [
        { id: "my-work", label: "My work", icon: BriefcaseBusiness, badge: myTasks.filter((task) => task.status !== "Complete").length },
        { id: "team", label: "My team", icon: Users },
        { id: "daily-log", label: "Daily update", icon: FileText },
        { id: "history", label: "Completed", icon: CheckCheck },
    ] : [
        { id: "my-work", label: "My work", icon: BriefcaseBusiness, badge: myTasks.filter((task) => task.status !== "Complete").length },
        { id: "daily-log", label: "Daily update", icon: FileText },
        { id: "history", label: "Completed", icon: CheckCheck },
    ];

    return (
        <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
            <div className="brand-lockup"><span className="brand-mark">P</span><span className="brand-name">POD<span>workroom</span></span></div>
            <div className="workspace-label">WORKSPACE</div>
            <div className="workspace-switch"><span className="workspace-dot" /> Operations team</div>
            <div className="nav-label">{isAdmin ? "MANAGE" : "YOUR SPACE"}</div>
            <nav className="main-nav" aria-label="Main navigation">
                {navItems.map(({ id, label, icon: Icon, badge }) => (
                    <button key={id} className={`nav-link ${activeView === id ? "active" : ""}`} onClick={() => { onNavigate(id); onCloseMobile(); }}>
                        <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{badge ? <span className="nav-badge">{badge}</span> : null}
                    </button>
                ))}
            </nav>
            <div className="sidebar-spacer" />
            {isAdmin && <div className="sidebar-note"><span className="note-icon"><ShieldCheck size={17} /></span><div><strong>Team pulse</strong><span>{workspace.members.length} active members</span></div><ArrowUpRight size={15} /></div>}
            <button className={`nav-link utility-link ${activeView === "preferences" ? "active" : ""}`} onClick={() => { onNavigate("preferences"); onCloseMobile(); }}><Settings2 size={18} /><span>Preferences</span></button>
            <div className="sidebar-user">
                <span className="avatar avatar-user" style={{ backgroundColor: user.color || "#e4e8e5" }}>{initials(user.name)}</span>
                <span className="sidebar-user-copy"><strong>{user.name}</strong><small>{isAdmin ? "Administrator" : user.title || "POD member"}</small></span>
                <button className="icon-button signout-button" title="Sign out" aria-label="Sign out" onClick={onSignOut}><LogOut size={16} /></button>
            </div>
        </aside>
    );
}
