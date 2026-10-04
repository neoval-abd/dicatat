import { createContext, useContext, useRef, useState, useEffect, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
type Kind = 'success' | 'error'
const Context = createContext<(message: string, kind?: Kind) => void>(() => {})
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: Kind } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const element = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = element.current
    if (toast && el && typeof el.showPopover === 'function') {
      if (el.matches(':popover-open')) el.hidePopover()
      el.showPopover()
    }
  }, [toast])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  function show(message: string, kind: Kind = 'success') {
    if (timer.current) clearTimeout(timer.current)
    setToast({ message, kind })
    timer.current = setTimeout(() => setToast(null), kind === 'error' ? 8000 : 4500)
  }
  return <Context.Provider value={show}>{children}{toast && <div ref={element} popover="manual" className={`toast ${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
    {toast.kind === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}<span>{toast.message}</span>
    <button className="icon-button" onClick={() => setToast(null)} aria-label="Tutup notifikasi"><X size={18} /></button>
  </div>}</Context.Provider>
}
export const useToast = () => useContext(Context)
