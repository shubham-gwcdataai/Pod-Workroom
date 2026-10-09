import { X, Trash2 } from 'lucide-react';

export default function DeleteDialog({ title, description, items, busy, error, onClose, onConfirm }) {
    return <div className="modal-backdrop" onMouseDown={() => !busy && onClose()}>
        <section className="task-dialog" role="dialog" aria-modal="true" aria-labelledby="bulk-delete-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><h2 id="bulk-delete-title">{title}</h2><button autoFocus className="icon-button" disabled={busy} aria-label="Close deletion" onClick={onClose}><X size={18} /></button></header>
            <p className="delete-description">{description}</p>
            <ul className="delete-item-list">{items.map((item) => <li key={item.id}><strong>{item.name}</strong><small>{item.detail}</small></li>)}</ul>
            {error && <p className="dialog-error" role="alert">{error}</p>}
            <footer><button className="button-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="button-danger" disabled={busy || !items.length} onClick={onConfirm}><Trash2 size={15} />{busy ? 'Deleting…' : `Delete ${items.length} ${items.length === 1 ? 'item' : 'items'}`}</button></footer>
        </section>
    </div>;
}
