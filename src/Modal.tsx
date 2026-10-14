import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** A native modal dialog: it traps focus, closes on Escape or (optionally) a
 *  backdrop click, and hands focus back to whatever opened it. Mount it to open it. */
export function Modal({ id, label, className = '', closeOnBackdrop = true, onClose, children }: {
  id?: string; label: string; className?: string; closeOnBackdrop?: boolean; onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const current = dialog.current; if (!current) return;
    if (!current.open) current.showModal();
    current.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => { if (current.open) current.close(); };
  }, []);
  // StrictMode remounts reopen the dialog before a queued close event lands.
  const closed = () => { if (!dialog.current?.open) onClose(); };
  return <dialog ref={dialog} id={id} className={`modal ${className}`} aria-label={label} onClose={closed}
    onClick={event => { if (closeOnBackdrop && event.target === event.currentTarget) onClose(); }}>
    <div className="modal-body">
      <button className="modal-close" aria-label="Close" onClick={onClose}><X className="ui-icon" aria-hidden="true"/></button>
      {children}
    </div>
  </dialog>;
}
