import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** A native modal dialog: it traps focus, closes on Escape or (optionally) a
 *  backdrop click, and hands focus back to whatever opened it. Mount it to open it.
 *  Every dialog shares one frame: a title row with the close button, then the
 *  body, which ends in a `.modal-actions` row. */
export function Modal({ id, label, title, className = '', closeOnBackdrop = true, dismissible = true, onClose, children }: {
  id?: string; label: string; title: ReactNode; className?: string; closeOnBackdrop?: boolean; dismissible?: boolean; onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const current = dialog.current; if (!current) return;
    if (!current.open) current.showModal();
    current.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
    return () => { if (current.open) current.close(); };
  }, []);
  // StrictMode remounts reopen the dialog before a queued close event lands.
  const closed = () => { if (!dialog.current?.open) onClose(); };
  return <dialog ref={dialog} id={id} className={`modal ${className}`} aria-label={label} onClose={closed} onCancel={event => { if (!dismissible) event.preventDefault(); }}
    onClick={event => { if (dismissible && closeOnBackdrop && event.target === event.currentTarget) onClose(); }}>
    <div className="modal-body">
      <header className="modal-head"><div className="modal-title">{title}</div><button className="modal-close" aria-label="Close" disabled={!dismissible} onClick={onClose}><X className="ui-icon" aria-hidden="true"/></button></header>
      {children}
    </div>
  </dialog>;
}
