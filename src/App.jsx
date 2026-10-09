import { useState } from "react";
import { Bell, CalendarDays, CircleHelp, Menu, X } from "lucide-react";
import AdminOverview from "./components/AdminOverview";
import DailyUpdateForm from "./components/DailyUpdateForm";
import DailyUpdatesView from "./components/DailyUpdatesView";
import MemberDialog from "./components/MemberDialog";
import MemberHistory from "./components/MemberHistory";
import MemberRoleDialog from "./components/MemberRoleDialog";
import MemberWork from "./components/MemberWork";
import NewTaskDialog from "./components/NewTaskDialog";
import Preferences from "./components/Preferences";
import Sidebar from "./components/Sidebar";
import TeamView from "./components/TeamView";
import WorkQueue from "./components/WorkQueue";
import { useWorkspace } from "./hooks/useWorkspace";
import { emailKey, visibleMembers as getVisibleMembers } from "./utils/hierarchy";
import TeamOverview from "./components/TeamOverview";
import ActivityHistory from "./components/ActivityHistory";
import Notifications from "./components/Notifications";
import { buildNotifications } from "./utils/dashboard";
import "./App.css";

const viewLabels = {
    overview: "Overview",
    "team-overview": "Team overview",
    activity: "Activity history",
    work: "Work queue",
    updates: "Daily check-ins",
    team: "POD members",
    "my-work": "My work",
    "daily-log": "Daily update",
    history: "Completed",
    preferences: "Preferences",
};

function App() {
    const {
        loading,
        user,
        workspace,
        activeView,
        navigate,
        viewFilters,
        feedback,
        dismissFeedback,
        reassignTasks,
        reassignPeople,
        saveFollowUp,
        loginError,
        busy,
        showTaskForm,
        setShowTaskForm,
        showMemberForm,
        setShowMemberForm,
        memberToEdit,
        setMemberToEdit,
        mobileNav,
        setMobileNav,
        counts,
        signOut,
        changeStatus,
        addTask,
        addMember,
        changeMemberRole,
        removeMember,
        removePeople,
        removeTasks,
        changeStatuses,
        submitDailyUpdate,
    } = useWorkspace();
    const [showNotifications, setShowNotifications] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('pod-demo:sidebar-collapsed') === 'true');
    const openView = (view, filters = {}) => { navigate(view, filters); setShowNotifications(false); };
    if (loading) {
        return (
            <div className="boot-screen">
                <span className="boot-mark">P</span>
                <p>Opening POD workspace</p>
            </div>
        );
    }
    if (!user) {
        return (
            <div className="access-unavailable">
                <span className="boot-mark">P</span>
                <h1>Connecting to your workspace</h1>
                <p>{loginError || "Domo is loading your authenticated account."}</p>
            </div>
        );
    }

    const isAdmin = user.role === "admin";
    const isTeamHead = user.role === "team-head";
    const isTeamLead = user.role === "team-lead";
    const isManager = isAdmin || isTeamHead || isTeamLead;
    const notificationItems = buildNotifications(workspace, user);
    const visibleMembers = getVisibleMembers(workspace.members, user);
    const myTasks = workspace.tasks.filter((task) =>
        emailKey(task.memberEmail) === emailKey(user.email)
    );
    return (
        <div
            className={`app-shell ${isAdmin ? "admin-shell" : "member-shell"} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
        >
            <Sidebar
                user={user}
                isAdmin={isAdmin}
                activeView={activeView}
                workspace={workspace}
                mobileNav={mobileNav}
                onNavigate={openView}
                onCloseMobile={() => setMobileNav(false)}
                onSignOut={signOut}
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed((previous) => { localStorage.setItem('pod-demo:sidebar-collapsed', String(!previous)); return !previous; })}
            />
            <main className="main-column">
                <header className="topbar">
                    <button
                        className="icon-button mobile-menu"
                        title="Open navigation"
                        aria-label="Open navigation"
                        onClick={() => setMobileNav(!mobileNav)}
                    >
                        <Menu size={19} />
                    </button>
                    <div className="crumb">
                        <span>Workspace</span>
                        <span className="crumb-slash">/</span>
                        <strong>
                            {viewLabels[activeView] || "Preferences"}
                        </strong>
                    </div>
                    <div className="topbar-actions">
                        <span className="today-label">
                            <CalendarDays size={15} />{" "}
                            {new Intl.DateTimeFormat("en", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                            }).format(new Date())}
                        </span>
                        <button
                            className="icon-button notification-button"
                            aria-label="Notifications"
                            title="Notifications"
                            aria-expanded={showNotifications}
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <Bell size={17} />
                            {notificationItems.length > 0 && <i />}
                        </button>
                        {showNotifications && <Notifications items={notificationItems} onNavigate={openView} onClose={() => setShowNotifications(false)} />}
                        <span
                            className="avatar topbar-avatar"
                            style={{ backgroundColor: user.color || "#e4e8e5" }}
                        >
                            {user.name.split(" ").map((part) => part[0]).join(
                                "",
                            ).slice(0, 2).toUpperCase()}
                        </span>
                    </div>
                </header>
                <div className="page-content">
                    {feedback && <div className={`feedback-banner feedback-${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}><span>{feedback.message}</span><button className="icon-button" aria-label="Dismiss message" onClick={dismissFeedback}><X size={16} /></button></div>}
                    {!isAdmin && isManager && activeView === "team-overview" && <TeamOverview workspace={workspace} user={user} onNavigate={openView} />}
                    {isAdmin && activeView === "activity" && <ActivityHistory activity={workspace.activity} />}
                    {isAdmin && activeView === "overview" && (
                        <AdminOverview
                            workspace={workspace}
                            counts={counts}
                            onNewTask={() => setShowTaskForm(true)}
                            onAddPerson={() => setShowMemberForm(true)}
                            onNavigate={openView}
                        />
                    )}
                    {isManager && activeView === "work" && (
                        <WorkQueue
                            key={JSON.stringify(viewFilters)}
                            initialFilters={viewFilters}
                            canManage={isAdmin}
                            onReassign={reassignTasks}
                            onDelete={removeTasks}
                            onBulkStatus={changeStatuses}
                            busy={busy}
                            tasks={workspace.tasks}
                            members={workspace.members}
                            onStatusChange={changeStatus}
                            onNewTask={() => setShowTaskForm(true)}
                        />
                    )}
                    {isManager && activeView === "updates" && (
                        <DailyUpdatesView key={JSON.stringify(viewFilters)} initialFilters={viewFilters} updates={workspace.dailyUpdates} members={workspace.members} currentUser={user} onFollowUp={saveFollowUp} busy={busy} />
                    )}
                    {(isAdmin || isTeamHead || isTeamLead) && activeView === "team" && (
                        <TeamView
                            key={JSON.stringify(viewFilters)}
                            initialFilters={viewFilters}
                            onReassignPeople={reassignPeople}
                            members={visibleMembers}
                            tasks={workspace.tasks}
                            currentUser={user}
                            reportingManager={workspace.reportingManager}
                            canManage={isAdmin}
                            onAddMember={() => setShowMemberForm(true)}
                            onEditRole={setMemberToEdit}
                            onDeleteMember={removeMember}
                            onDeletePeople={removePeople}
                            busy={busy}
                        />
                    )}
                    {!isAdmin && activeView === "my-work" && (
                        <MemberWork
                            key={JSON.stringify(viewFilters)}
                            initialFilters={viewFilters}
                            updates={workspace.dailyUpdates}
                            reportingManager={workspace.reportingManager}
                            busy={busy}
                            onNavigate={openView}
                            user={user}
                            tasks={myTasks}
                            onStatusChange={changeStatus}
                            onDailyUpdate={() => openView("daily-log")}
                        />
                    )}
                    {!isAdmin && activeView === "daily-log" && (
                        <DailyUpdateForm
                            user={user}
                            updates={workspace.dailyUpdates.filter((update) =>
                                emailKey(update.memberEmail) === emailKey(user.email)
                            )}
                            onSave={submitDailyUpdate}
                        />
                    )}
                    {!isAdmin && activeView === "history" && (
                        <MemberHistory
                            key={JSON.stringify(viewFilters)}
                            initialFilters={viewFilters}
                            user={user}
                            tasks={myTasks.filter((task) =>
                                task.status === "Complete"
                            )}
                        />
                    )}
                    {activeView === "preferences" && <Preferences
                        user={user}
                    />}
                </div>
                <footer className="page-footer">
                    <span>© 2026 POD workroom</span>
                    <span>
                        <CircleHelp size={14} />{" "}
                        Need a hand? Contact your POD admin
                    </span>
                </footer>
            </main>
            {mobileNav && (
                <button
                    className="scrim"
                    aria-label="Close navigation"
                    onClick={() => setMobileNav(false)}
                />
            )}
            {isAdmin && showTaskForm && (
                <NewTaskDialog
                    members={workspace.members}
                    onClose={() => setShowTaskForm(false)}
                    onCreate={addTask}
                />
            )}
            {isAdmin && showMemberForm && (
                <MemberDialog
                    members={workspace.members}
                    onClose={() => setShowMemberForm(false)}
                    onSave={addMember}
                    busy={busy}
                />
            )}
            {isAdmin && memberToEdit && (
                <MemberRoleDialog
                    member={memberToEdit}
                    members={workspace.members}
                    onClose={() => setMemberToEdit(null)}
                    onSave={changeMemberRole}
                    busy={busy}
                />
            )}
        </div>
    );
}

export default App;
