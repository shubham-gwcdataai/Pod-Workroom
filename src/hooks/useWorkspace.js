import { useEffect, useMemo, useState } from "react";
import {
    authenticateCurrentUser,
    createMember,
    createTask,
    deleteMember,
    initializeStore,
    loadWorkspace,
    saveDailyUpdate,
    updateMember,
    updateTask,
} from "../podStore";

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
                    setActiveView(authenticatedUser.role === "admin" ? "overview" : "my-work");
                } else {
                    setLoginError("No matching Domo user was found in the POD collections.");
                }
            })
            .catch(() => alive && setLoginError("Could not connect to POD data. Check the AppDB collections and try again."))
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
                if (userRole !== currentUser?.role) setActiveView(currentUser?.role === 'admin' ? 'overview' : 'my-work');
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
    }

    async function refreshWorkspace() { setWorkspace(await loadWorkspace()); }

    async function changeStatus(taskId, status) {
        setBusy(true);
        try {
            await updateTask(taskId, { status, ...(status === "Complete" ? { completedAt: new Date().toISOString().slice(0, 10) } : {}) });
            await refreshWorkspace();
        } finally {
            setBusy(false);
        }
    }

    async function addTask(task) {
        setBusy(true);
        try {
            await createTask({ ...task, assignedAt: new Date().toISOString().slice(0, 10) });
            await refreshWorkspace();
            setShowTaskForm(false);
        } finally {
            setBusy(false);
        }
    }

    async function addMember(member) {
        setBusy(true);
        try {
            await createMember(member);
            await refreshWorkspace();
            setShowMemberForm(false);
        } finally {
            setBusy(false);
        }
    }

    async function changeMemberRole(email, changes) {
        setBusy(true);
        try {
            await updateMember(email, changes);
            await refreshWorkspace();
            setMemberToEdit(null);
        } finally {
            setBusy(false);
        }
    }

    async function removeMember(email) {
        setBusy(true);
        try {
            await deleteMember(email);
            await refreshWorkspace();
        } finally {
            setBusy(false);
        }
    }

    async function submitDailyUpdate(update) {
        setBusy(true);
        try {
            await saveDailyUpdate(update);
            await refreshWorkspace();
        } finally {
            setBusy(false);
        }
    }

    return {
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
    };
}
