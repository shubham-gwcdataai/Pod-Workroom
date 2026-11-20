export function initials(name = "") {
    return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function prettyDate(date) {
    if (!date) return "No due date";
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" })
        .format(new Date(`${date}T12:00:00`));
}

export function buildWeekData(tasks) {
    const days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setHours(12, 0, 0, 0);
        date.setDate(date.getDate() - 6 + index);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return { key, day: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date), closed: 0, assigned: 0 };
    });
    const byDate = new Map(days.map((day) => [day.key, day]));
    for (const task of tasks) {
        const assignedDay = byDate.get(task.assignedAt?.slice(0, 10));
        const completedDay = byDate.get(task.completedAt?.slice(0, 10));
        if (assignedDay) assignedDay.assigned += 1;
        if (completedDay) completedDay.closed += 1;
    }
    return days;
}
