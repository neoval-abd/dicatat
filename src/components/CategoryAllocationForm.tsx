import { useState, type FormEvent } from 'react'
import type { BudgetAllocation, Category } from '../types'
import { Modal, Confirm } from './ui/Modal'
import { MoneyInput } from './ui/MoneyInput'
import { useToast } from './ui/Toast'
import { useAuth } from '../context/AuthContext'
import { saveBudgetAllocation, deleteBudgetAllocation } from '../services/budgetService'
import { errorMessage, formatAmountInput, parseAmount } from '../utils/format'

export function CategoryAllocationForm({
  monthlyBudgetId,
  allocation,
  categories,
  existingCategoryIds,
  onClose,
  onSaved
}: {
  monthlyBudgetId: string
  allocation?: BudgetAllocation | null
  categories: Category[]
  existingCategoryIds: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const { session } = useAuth()
  const toast = useToast()

  const [categoryId, setCategoryId] = useState(allocation?.category_id || '')
  const [amount, setAmount] = useState(formatAmountInput(allocation ? String(allocation.amount) : ''))
  const [notes, setNotes] = useState(allocation?.notes || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  // Filter to expense categories that are not yet allocated (or the one being edited)
  const availableCategories = categories.filter(c => {
    if ((c.type || 'expense') !== 'expense') return false
    if (allocation && c.id === allocation.category_id) return true
    return !existingCategoryIds.includes(c.id)
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!session || busy) return
    setBusy(true)
    setError(null)
    try {
      const cleanAmount = parseAmount(amount)
      if (!categoryId) throw new Error('Pilih kategori pengeluaran.')
      await saveBudgetAllocation(
        session.user.id,
        monthlyBudgetId,
        categoryId,
        cleanAmount,
        notes,
        allocation?.id
      )
      onSaved()
      toast(`Alokasi kategori berhasil ${allocation ? 'diubah' : 'ditambahkan'}`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!session || !allocation || busy) return
    setBusy(true)
    try {
      await deleteBudgetAllocation(session.user.id, allocation.id)
      onSaved()
      toast('Alokasi kategori berhasil dihapus')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Modal
        title={allocation ? 'Edit batas kategori' : 'Tambah batas kategori'}
        onClose={onClose}
        busy={busy}
      >
        <form className="form-stack" onSubmit={submit}>
          <p className="muted text-sm">
            Atur batas anggaran maksimal untuk kategori pengeluaran tertentu di bulan ini.
          </p>

          <div className="field">
            <label htmlFor="alloc-category">Kategori pengeluaran</label>
            <select
              id="alloc-category"
              required
              disabled={busy || (allocation ? true : false)}
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
            >
              <option value="" disabled>
                Pilih kategori
              </option>
              {availableCategories.map(c => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {!availableCategories.length && !allocation && (
              <p className="field-error">Semua kategori pengeluaran sudah memiliki batas anggaran.</p>
            )}
          </div>

          <div className="field">
            <label htmlFor="alloc-amount">Nominal anggaran</label>
            <MoneyInput id="alloc-amount" value={amount} onChange={setAmount} disabled={busy} large />
          </div>

          <div className="field">
            <label htmlFor="alloc-notes">
              Catatan <small>opsional</small>
            </label>
            <input
              id="alloc-notes"
              type="text"
              maxLength={500}
              placeholder="Misalnya: batas jajan harian"
              value={notes}
              disabled={busy}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {error && <p role="alert" className="form-error">{error}</p>}

          <button className="button primary full" disabled={busy || (!allocation && !availableCategories.length)}>
            {busy ? 'Menyimpan…' : 'Simpan batas kategori'}
          </button>

          {allocation && (
            <button
              type="button"
              className="text-button destructive"
              disabled={busy}
              onClick={() => setConfirm(true)}
            >
              Hapus batas kategori ini
            </button>
          )}
        </form>
      </Modal>

      {confirm && (
        <Confirm
          title="Hapus batas kategori?"
          description="Batas kategori ini akan dihapus. Pengeluaran aktual tetap tercatat."
          onClose={() => setConfirm(false)}
          onConfirm={remove}
          busy={busy}
        />
      )}
    </>
  )
}
