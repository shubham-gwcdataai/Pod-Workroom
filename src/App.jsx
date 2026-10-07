import { Bell, CalendarDays, CircleHelp, Menu } from "lucide-react";
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
import { visibleMembers as getVisibleMembers } from "./utils/hierarchy";
import "./App.css";

const viewLabels = {
    overview: "Overview",
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
        setActiveView,
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
        submitDailyUpdate,
    } = useWorkspace();
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
    const visibleMembers = getVisibleMembers(workspace.members, user);
    const myTasks = workspace.tasks.filter((task) =>
        task.memberEmail === user.email
    );
    return (
        <div
            className={`app-shell ${isAdmin ? "admin-shell" : "member-shell"}`}
        >
            <Sidebar
                user={user}
                isAdmin={isAdmin}
                activeView={activeView}
                workspace={workspace}
                mobileNav={mobileNav}
                onNavigate={setActiveView}
                onCloseMobile={() => setMobileNav(false)}
                onSignOut={signOut}
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
                        >
                            <Bell size={17} />
                            <i />
                        </button>
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
                    {isAdmin && activeView === "overview" && (
                        <AdminOverview
                            workspace={workspace}
                            counts={counts}
                            onNewTask={() => setShowTaskForm(true)}
                            onNavigate={setActiveView}
                        />
                    )}
                    {isAdmin && activeView === "work" && (
                        <WorkQueue
                            tasks={workspace.tasks}
                            members={workspace.members}
                            onStatusChange={changeStatus}
                            onNewTask={() => setShowTaskForm(true)}
                        />
                    )}
                    {isAdmin && activeView === "updates" && (
                        <DailyUpdatesView updates={workspace.dailyUpdates} />
                    )}
                    {(isAdmin || isTeamHead || isTeamLead) && activeView === "team" && (
                        <TeamView
                            members={visibleMembers}
                            tasks={workspace.tasks}
                            currentUser={user}
                            canManage={isAdmin}
                            onAddMember={() => setShowMemberForm(true)}
                            onEditRole={setMemberToEdit}
                            onDeleteMember={removeMember}
                            busy={busy}
                        />
                    )}
                    {!isAdmin && activeView === "my-work" && (
                        <MemberWork
                            user={user}
                            tasks={myTasks}
                            onStatusChange={changeStatus}
                            onDailyUpdate={() => setActiveView("daily-log")}
                        />
                    )}
                    {!isAdmin && activeView === "daily-log" && (
                        <DailyUpdateForm
                            user={user}
                            updates={workspace.dailyUpdates.filter((update) =>
                                update.memberEmail === user.email
                            )}
                            onSave={submitDailyUpdate}
                        />
                    )}
                    {!isAdmin && activeView === "history" && (
                        <MemberHistory
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
