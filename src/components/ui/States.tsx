import { LoaderCircle, AlertCircle, NotebookPen } from 'lucide-react'
export function Loading({ text = 'Memuat data…' }: { text?: string }) {
  return <div className="state" role="status"><LoaderCircle className="spin" size={26} /><p>{text}</p></div>
}
export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="state" role="alert"><AlertCircle size={30} /><p>{message}</p><button className="button secondary" onClick={retry}>Coba lagi</button></div>
}
export function EmptyState({ title = 'Belum ada pengeluaran', description = 'Setiap catatan kecil membantu Kamu memahami keuangan.', action }: { title?: string; description?: string; action?: React.ReactNode }) {
  return <div className="state empty"><span className="empty-icon"><NotebookPen size={26} /></span><h3>{title}</h3><p>{description}</p>{action}</div>
}
