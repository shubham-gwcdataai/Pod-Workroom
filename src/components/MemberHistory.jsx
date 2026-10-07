import { Check, CheckCheck } from "lucide-react";
import { prettyDate } from "../utils/date";
import { EmptyState, PageIntro } from "./Shared";

export default function MemberHistory({ tasks }) {
    return (
        <>
            <PageIntro
                eyebrow="YOUR POD DESK"
                title="A good week, made visible."
                subtitle="Completed work and the progress you’ve made."
            />
            <section className="history-summary">
                <span className="history-check">
                    <CheckCheck size={21} />
                </span>
                <div>
                    <strong>{tasks.length} assignments completed</strong>
                    <span>
                        Every finished handoff makes space for the next one.
                    </span>
                </div>
            </section>
            <div className="history-list">
                {tasks.map((task) => (
                    <article className="history-row" key={task.id}>
                        <span className="history-row-check">
                            <Check size={15} />
                        </span>
                        <div>
                            <strong>{task.title}</strong>
                            <span>
                                {task.category} <b>·</b>{" "}
                                {prettyDate(task.completedAt || task.dueDate)}
                            </span>
                        </div>
                        <span className="complete-label">Complete</span>
                    </article>
                ))}
                {tasks.length === 0 && (
                    <EmptyState
                        title="Your wins will show here"
                        detail="Completed assignments appear in this list."
                    />
                )}
            </div>
        </>
    );
}


