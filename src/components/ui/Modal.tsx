import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ title, children, onClose, busy = false, wide = false }: {
  title: string; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useId()
  useEffect(() => { const el = dialog.current; el?.showModal(); return () => { el?.close() } }, [])
  return <dialog ref={dialog} className={`sheet ${wide ? 'wide' : ''}`} aria-labelledby={heading}
    onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <div className="sheet-handle" /><div className="sheet-heading"><h2 id={heading}>{title}</h2>
      <button type="button" className="icon-button" disabled={busy} onClick={onClose} aria-label="Tutup"><X size={21} /></button>
    </div><div className="sheet-body">{children}</div>
  </dialog>
}
export function Confirm({ title, description, onClose, onConfirm, busy }: {
  title: string; description: string; onClose: () => void; onConfirm: () => void; busy: boolean
}) {
  return <Modal title={title} onClose={onClose} busy={busy}><p className="muted mb-6">{description}</p>
    <div className="button-row"><button className="button secondary" disabled={busy} onClick={onClose}>Batal</button>
      <button className="button danger" disabled={busy} onClick={onConfirm}>{busy ? 'Menghapus…' : 'Hapus'}</button></div>
  </Modal>
}
