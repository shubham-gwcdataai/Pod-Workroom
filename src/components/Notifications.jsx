import { X } from 'lucide-react';

export default function Notifications({ items, onNavigate, onClose }) {
    return <section className="notifications-panel" aria-label="Workspace notifications">
        <header><strong>Notifications</strong><button className="icon-button" aria-label="Close notifications" onClick={onClose}><X size={16} /></button></header>
        {items.map((item) => <button className="notification-item" key={item.id} onClick={() => { onNavigate(item.view, item.filters); onClose(); }}><strong>{item.title}</strong><span>{item.detail}</span></button>)}
        {items.length === 0 && <p>No current alerts. You’re up to date.</p>}
    </section>;
}
