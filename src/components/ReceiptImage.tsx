import { useState } from 'react'
import { ImageOff, Expand } from 'lucide-react'
import { receiptUrl } from '../services/storageService'
import { useAsync } from '../hooks/useAsync'
import { Modal } from './ui/Modal'
export function ReceiptImage({ path }: { path: string }) {
  const { data, loading, error, retry } = useAsync(() => receiptUrl(path), [path])
  const [expanded, setExpanded] = useState(false)
  const [broken, setBroken] = useState(false)
  if (loading) return <div className="receipt-placeholder" role="status">Memuat foto nota…</div>
  if (error || broken) return <div className="receipt-placeholder"><ImageOff /><p>{error || 'Tautan foto kedaluwarsa atau foto gagal dimuat.'}</p><button className="text-button" onClick={() => { setBroken(false); retry() }}>Muat ulang foto</button></div>
  return <><button className="receipt-thumbnail" type="button" onClick={() => setExpanded(true)} aria-label="Perbesar foto nota">
    <img src={data!} alt="Foto nota transaksi" loading="lazy" onError={() => setBroken(true)} /><span><Expand size={16} /> Perbesar nota</span>
  </button>{expanded && <Modal title="Foto nota" onClose={() => setExpanded(false)} wide><img className="receipt-full" src={data!} alt="Foto nota ukuran penuh" onError={() => { setExpanded(false); setBroken(true) }} /></Modal>}</>
}
