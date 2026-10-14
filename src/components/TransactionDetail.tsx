import { useState } from 'react'
import { Pencil, Trash2, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
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

export function TransactionDetail({
  transaction,
  onClose,
  onEdit,
  onDeleted
}: {
  transaction: Transaction
  onClose: () => void
  onEdit: () => void
  onDeleted: () => void
}) {
  const { session } = useAuth()
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const isIncome = transaction.type === 'income'

  async function remove() {
    if (!session || busy) return
    setBusy(true)
    try {
      await deleteTransaction(session.user.id, transaction.id)
      const cleaned = transaction.receipt_path ? await cleanReceipt(session.user.id, transaction.receipt_path) : true
      onDeleted()
      const label = isIncome ? 'Pemasukan' : 'Pengeluaran'
      toast(
        cleaned
          ? `${label} berhasil dihapus`
          : `${label} dihapus. Bukti foto belum terhapus; ulangi pembersihan di Pengaturan.`,
        cleaned ? 'success' : 'error'
      )
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Modal title={isIncome ? 'Detail pemasukan' : 'Detail pengeluaran'} onClose={onClose} busy={busy}>
        <div className="detail-summary">
          <CategoryIcon icon={transaction.category.icon} size={25} />
          <div className="detail-type-badge">
            <span className={`pill ${isIncome ? 'income-pill' : ''}`}>
              {isIncome ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
              {isIncome ? 'Pemasukan' : 'Pengeluaran'}
            </span>
          </div>
          <p>{transaction.category.name}</p>
          <h2 className={isIncome ? 'income-text' : ''}>
            {isIncome ? '+' : '-'}
            {formatRupiah(transaction.amount)}
          </h2>
        </div>

        <dl className="detail-info">
          <div>
            <dt>Tanggal</dt>
            <dd>{displayDate(transaction.transaction_date)}</dd>
          </div>
          <div>
            <dt>Waktu</dt>
            <dd>{transaction.transaction_time.slice(0, 5)}</dd>
          </div>
          {isIncome && transaction.source && (
            <div>
              <dt>Sumber</dt>
              <dd>{transaction.source}</dd>
            </div>
          )}
          <div>
            <dt>Catatan</dt>
            <dd className="note-text">{transaction.note || 'Tidak ada catatan'}</dd>
          </div>
        </dl>

        {transaction.receipt_path && (
          <div className="field mt-5">
            <span className="field-label">Foto bukti</span>
            <ReceiptImage path={transaction.receipt_path} />
          </div>
        )}

        <div className="button-row mt-6">
          <button className="button secondary" disabled={busy} onClick={() => setConfirm(true)}>
            <Trash2 size={17} /> Hapus
          </button>
          <button className="button primary" disabled={busy} onClick={onEdit}>
            <Pencil size={17} /> Edit transaksi
          </button>
        </div>
      </Modal>

      {confirm && (
        <Confirm
          title={`Hapus ${isIncome ? 'pemasukan' : 'pengeluaran'} ini?`}
          description="Transaksi dan bukti foto terkait akan dihapus. Tindakan ini tidak bisa dibatalkan."
          onClose={() => setConfirm(false)}
          onConfirm={remove}
          busy={busy}
        />
      )}
    </>
  )
}
