import { useState } from "react";
import { Check, ClipboardList, FileText } from "lucide-react";
import { PageIntro } from "./Shared";
import { localDate } from "../utils/date";

export default function DailyUpdateForm({ user, updates, onSave }) {
    const [date, setDate] = useState(localDate());
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const currentUpdate = updates.find((update) => update.date === date);

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setSaved(false);
        setError("");
        const form = new FormData(event.currentTarget);
        try {
            await onSave({
                date: form.get("date"),
                name: user.name,
                memberEmail: user.email,
                yesterdayActivity: form.get("yesterdayActivity").trim(),
                todayActivity: form.get("todayActivity").trim(),
                blockers: form.get("blockers").trim(),
                blockerStatus: form.get("blockerStatus"),
            });
            setSaved(true);
        } catch {
            setError(
                "Could not save this check-in. Check your AppDB connection and try again.",
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <PageIntro
                eyebrow="YOUR POD DESK"
                title="Daily update"
                subtitle="Capture what moved yesterday, what’s moving today, and anything in the way."
            />
            <section className="daily-form-layout">
                <form
                    key={`${date}-${currentUpdate?.id || "new"}`}
                    className="daily-entry-form panel"
                    onSubmit={submit}
                >
                    <div className="daily-form-heading">
                        <span className="daily-form-icon">
                            <FileText size={18} />
                        </span>
                        <div>
                            <span className="panel-overline">
                                POD DAILY LOG
                            </span>
                            <h2>Today’s check-in</h2>
                        </div>
                        {currentUpdate && (
                            <span className="saved-indicator">
                                <Check size={13} /> Saved for this date
                            </span>
                        )}
                    </div>
                    <div className="daily-form-meta">
                        <label>
                            Date<input
                                name="date"
                                type="date"
                                value={date}
                                onChange={(event) => {
                                    setDate(event.target.value);
                                    setSaved(false);
                                }}
                                required
                            />
                        </label>
                        <label>
                            Name<input value={user.name} readOnly />
                        </label>
                    </div>
                    <label>
                        Yesterday’s Activity<textarea
                            name="yesterdayActivity"
                            placeholder="What did you move forward yesterday?"
                            defaultValue={currentUpdate?.yesterdayActivity ||
                                ""}
                            required
                            rows="3"
                        />
                    </label>
                    <label>
                        Today’s Activity<textarea
                            name="todayActivity"
                            placeholder="What are you focused on today?"
                            defaultValue={currentUpdate?.todayActivity || ""}
                            required
                            rows="3"
                        />
                    </label>
                    <label>
                        Blockers<textarea
                            name="blockers"
                            placeholder="Anything blocked or waiting on someone? Leave blank if there are no blockers."
                            defaultValue={currentUpdate?.blockers || ""}
                            rows="2"
                        />
                    </label>
                    <label className="blocker-status-field">
                        Solved / Not<select
                            name="blockerStatus"
                            defaultValue={currentUpdate?.blockerStatus ||
                                "No blocker"}
                        >
                            <option>No blocker</option>
                            <option>Not solved</option>
                            <option>Solved</option>
                        </select>
                    </label>
                    {error && (
                        <p className="daily-form-error" role="alert">{error}</p>
                    )}
                    {saved && (
                        <p className="daily-form-success" role="status">
                            <Check size={15} /> Daily update saved.
                        </p>
                    )}
                    <footer>
                        <span>One check-in per member per day</span>
                        <button
                            className="button-primary"
                            type="submit"
                            disabled={saving}
                        >
                            <Check size={15} />{" "}
                            {saving ? "Saving…" : "Save daily update"}
                        </button>
                    </footer>
                </form>
                <aside className="daily-form-aside">
                    <span className="aside-log-icon">
                        <ClipboardList size={19} />
                    </span>
                    <span className="panel-overline">A GOOD HANDOFF</span>
                    <h2>Make the next step clear.</h2>
                    <p>
                        Your update is shared with your head, lead, and admin so they can spot
                        progress, support blockers, and keep the work moving.
                    </p>
                    <div className="aside-log-fields">
                        <span>Date</span>
                        <span>Name</span>
                        <span>Yesterday</span>
                        <span>Today</span>
                        <span>Blockers</span>
                        <span>Status</span>
                    </div>
                </aside>
            </section>
        </>
    );
}


