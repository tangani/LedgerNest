import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import './Modal.css'
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    dialog?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [])
  return <dialog ref={ref} className="editor-dialog" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose() }}>
    <header className="dialog-heading"><h2 id={titleId}>{title}</h2><button type="button" className="secondary" aria-label="Close dialog" onClick={onClose}>Close</button></header>
    <div className="dialog-body">{children}</div>
  </dialog>
}
