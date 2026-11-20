import { ClipboardList } from "lucide-react";

export function EmptyState({ title, detail }) {
    return (
        <div className="empty-state">
            <span>
                <ClipboardList size={20} />
            </span>
            <strong>{title}</strong>
            <p>{detail}</p>
        </div>
    );
}


