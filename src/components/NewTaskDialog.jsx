import { useState } from "react";
import { FilePlus2, X } from "lucide-react";

export default function NewTaskDialog({ members, onClose, onCreate }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");
        const form = new FormData(event.currentTarget);
        try {
            await onCreate({
                title: form.get("title"),
                category: form.get("category"),
                priority: form.get("priority"),
                memberEmail: form.get("memberEmail"),
                dueDate: form.get("dueDate"),
                status: "Not started",
                hours: 0,
            });
        } catch {
            setError(
                "Could not save this assignment. Check your AppDB connection.",
            );
            setSaving(false);
        }
    }
    return (
        <div
            className="modal-backdrop"
            onMouseDown={(event) =>
                event.target === event.currentTarget && onClose()}
        >
            <section
                className="task-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-task-title"
            >
                <header>
                    <div>
                        <span className="panel-overline">POD WORK QUEUE</span>
                        <h2 id="new-task-title">New assignment</h2>
                    </div>
                    <button
                        className="icon-button"
                        title="Close"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </header>
                <form onSubmit={submit}>
                    <label>
                        Assignment name<input
                            name="title"
                            placeholder="What needs to get done?"
                            required
                            autoFocus
                        />
                    </label>
                    <div className="form-row">
                        <label>
                            Workstream<input
                                name="category"
                                placeholder="e.g. Operations"
                                required
                            />
                        </label>
                        <label>
                            Priority<select name="priority">
                                <option>Normal</option>
                                <option>High</option>
                                <option>Low</option>
                            </select>
                        </label>
                    </div>
                    <div className="form-row">
                        <label>
                            Assign to<select name="memberEmail" required>
                                {members.map((member) => (
                                    <option
                                        value={member.email}
                                        key={member.email}
                                    >
                                        {member.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Due date<input
                                name="dueDate"
                                type="date"
                                required
                            />
                        </label>
                    </div>
                    {error && (
                        <p className="dialog-error" role="alert">{error}</p>
                    )}
                    <footer>
                        <button
                            className="button-secondary"
                            type="button"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            className="button-primary"
                            type="submit"
                            disabled={saving}
                        >
                            <FilePlus2 size={16} />{" "}
                            {saving ? "Saving…" : "Create assignment"}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}


