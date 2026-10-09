import { useEffect, useMemo, useState } from "react";
import {
    authenticateCurrentUser,
    bulkReassignPeople,
    bulkReassignTasks,
    bulkDeletePeople,
    bulkDeleteTasks,
    bulkUpdateTaskStatus,
    createMember,
    createTask,
    deleteMember,
    followUpBlocker,
    initializeStore,
    loadWorkspace,
    saveDailyUpdate,
    updateMember,
    updateTask,
} from "../podStore";
import { localDate } from '../utils/date';

const initialView = (user) => user?.role === 'admin' ? 'overview' : ['team-head', 'team-lead'].includes(user?.role) ? 'team-overview' : 'my-work';

export function useWorkspace() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [workspace, setWorkspace] = useState({ members: [], tasks: [], dailyUpdates: [] });
    const [activeView, setActiveView] = useState("overview");
    const [loginError, setLoginError] = useState("");
    const [busy, setBusy] = useState(false);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [showMemberForm, setShowMemberForm] = useState(false);
    const [memberToEdit, setMemberToEdit] = useState(null);
    const [mobileNav, setMobileNav] = useState(false);
    const [viewFilters, setViewFilters] = useState({});
    const [feedback, setFeedback] = useState(null);
    const signedIn = Boolean(user);
    const userRole = user?.role;
    const userEmail = user?.email;

    useEffect(() => {
        let alive = true;
        initializeStore()
            .then(loadWorkspace)
            .then(async (data) => {
                if (!alive) return;
                setWorkspace(data);
                const authenticatedUser = await authenticateCurrentUser();
                if (!alive) return;
                if (authenticatedUser) {
                    setUser(authenticatedUser);
                    localStorage.setItem("pod-demo:session", JSON.stringify(authenticatedUser));
                    setActiveView(initialView(authenticatedUser));
                } else {
                    setLoginError("No matching Domo user was found in the POD collections.");
                }
            })
            .catch((error) => alive && setLoginError(error.message || "Could not connect to POD data. Check the AppDB collections and try again."))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        if (!signedIn) return undefined;
        let alive = true;
        const refresh = () => {
            if (document.visibilityState !== "visible") return;
            Promise.all([loadWorkspace(), authenticateCurrentUser()]).then(([data, currentUser]) => {
                if (!alive) return;
                setWorkspace(data);
                if (userRole !== currentUser?.role) { setActiveView(initialView(currentUser)); setViewFilters({}); }
                setUser(currentUser);
            }).catch(() => {});
        };
        const interval = window.setInterval(refresh, 15000);
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            alive = false;
            window.clearInterval(interval);
            window.removeEventListener("focus", refresh);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [signedIn, userEmail, userRole]);

    const counts = useMemo(() => workspace.tasks.reduce((totals, task) => {
        totals[task.status] = (totals[task.status] || 0) + 1;
        return totals;
    }, {}), [workspace.tasks]);

    function signOut() {
        localStorage.removeItem("pod-demo:session");
        setUser(null);
        setLoginError("");
        setActiveView("overview");
        setFeedback(null);
        setViewFilters({});
    }

    function navigate(view, filters = {}) { setViewFilters(filters); setActiveView(view); }

    async function refreshWorkspace() { setWorkspace(await loadWorkspace()); }

    async function perform(action, message, afterSave, rethrow = true) {
        setBusy(true);
        setFeedback(null);
        try {
            const result = await action();
            let warning = result?.warning || result?.warnings?.join(' ');
            try { await refreshWorkspace(); } catch { warning = 'Saved, but the latest data could not be reloaded. Refresh the page to see the change.'; }
            afterSave?.();
            setFeedback({ kind: warning || result?.failed ? 'warning' : 'success', message: `${typeof message === 'function' ? message(result) : message}${warning ? ` ${warning}` : ''}` });
            return result;
        } catch (error) {
            setFeedback({ kind: 'error', message: error.message || 'The change could not be saved. Try again.' });
            if (rethrow) throw error;
            return null;
        } finally { setBusy(false); }
    }

    async function changeStatus(taskId, status) {
        return perform(() => updateTask(taskId, { status }), 'Task status saved.', null, false);
    }

    async function addTask(task) {
        return perform(() => createTask({ ...task, assignedAt: localDate() }), 'Assignment created.', () => setShowTaskForm(false));
    }

    async function addMember(member) {
        return perform(() => createMember(member), 'Person added.', () => setShowMemberForm(false));
    }

    async function changeMemberRole(email, changes) {
        return perform(() => updateMember(email, changes), 'Person details saved.', () => setMemberToEdit(null));
    }

    async function removeMember(email) {
        return perform(() => deleteMember(email), 'Person deleted. Work history retained.');
    }

    async function submitDailyUpdate(update) {
        return perform(() => saveDailyUpdate(update), 'Daily check-in saved.');
    }

    const reassignTasks = (ids, email) => perform(() => bulkReassignTasks(ids, email), (result) => `${result.saved} assignments reassigned; ${result.failed} failed.`);
    const reassignPeople = (emails, manager) => perform(() => bulkReassignPeople(emails, manager), (result) => `${result.saved} people reassigned; ${result.failed} failed.`);
    const saveFollowUp = (id, changes) => perform(() => followUpBlocker(id, changes), 'Blocker follow-up saved.');
    const removePeople = (emails) => perform(() => bulkDeletePeople(emails), (result) => `${result.saved} people deleted; ${result.failed} failed. Work history retained.`);
    const removeTasks = (ids) => perform(() => bulkDeleteTasks(ids), (result) => `${result.saved} assignments deleted; ${result.failed} failed.`);
    const changeStatuses = (ids, status) => perform(() => bulkUpdateTaskStatus(ids, status), (result) => `${result.saved} assignment statuses updated; ${result.failed} failed.`);

    return {
        loading,
        user,
        workspace,
        activeView,
        setActiveView,
        navigate,
        viewFilters,
        feedback,
        dismissFeedback: () => setFeedback(null),
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
        reassignTasks,
        reassignPeople,
        saveFollowUp,
        removePeople,
        removeTasks,
        changeStatuses,
    };
}
