import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { Transaction } from '../types'
import { useAuth } from '../context/AuthContext'
import { formatRupiah, errorMessage } from '../utils/format'
import { displayDate } from '../utils/date'
import { deleteTransaction } from '../services/transactionService'
import { cleanReceipt } from '../services/storageService'
import { CategoryIcon } from './CategoryIcon'
import { Modal, Confirm } from './ui/Modal'
import { ReceiptImage } from './ReceiptImage'
import { useToast } from './ui/Toast'
export function TransactionDetail({ transaction, onClose, onEdit, onDeleted }: {
  transaction: Transaction; onClose: () => void; onEdit: () => void; onDeleted: () => void
}) {
  const { session } = useAuth(), toast = useToast()
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false)
  async function remove() {
    if (!session || busy) return
    setBusy(true)
    try {
      await deleteTransaction(session.user.id, transaction.id)
      const cleaned = transaction.receipt_path ? await cleanReceipt(session.user.id, transaction.receipt_path) : true
      onDeleted()
      toast(cleaned ? 'Transaksi berhasil dihapus' : 'Transaksi dihapus. Nota belum terhapus; ulangi pembersihan di Pengaturan.', cleaned ? 'success' : 'error')
    } catch (error) { toast(errorMessage(error), 'error') } finally { setBusy(false) }
  }
  return <><Modal title="Detail pengeluaran" onClose={onClose} busy={busy}>
    <div className="detail-summary"><CategoryIcon icon={transaction.category.icon} size={25} /><p>{transaction.category.name}</p><h2>{formatRupiah(transaction.amount)}</h2></div>
    <dl className="detail-info"><div><dt>Tanggal</dt><dd>{displayDate(transaction.transaction_date)}</dd></div><div><dt>Waktu</dt><dd>{transaction.transaction_time.slice(0, 5)}</dd></div><div><dt>Catatan</dt><dd className="note-text">{transaction.note || 'Tidak ada catatan'}</dd></div></dl>
    {transaction.receipt_path && <div className="field mt-5"><span className="field-label">Foto nota</span><ReceiptImage path={transaction.receipt_path} /></div>}
    <div className="button-row mt-6"><button className="button secondary" disabled={busy} onClick={() => setConfirm(true)}><Trash2 size={17} /> Hapus</button>
      <button className="button primary" disabled={busy} onClick={onEdit}><Pencil size={17} /> Edit transaksi</button></div>
  </Modal>{confirm && <Confirm title="Hapus transaksi ini?" description="Transaksi dan foto nota terkait akan dihapus. Tindakan ini tidak bisa dibatalkan." onClose={() => setConfirm(false)} onConfirm={remove} busy={busy} />}</>
}
