import { useState, type FormEvent } from 'react'
import type { Budget } from '../types'
import { Modal, Confirm } from './ui/Modal'
import { MoneyInput } from './ui/MoneyInput'
import { useToast } from './ui/Toast'
import { useAuth } from '../context/AuthContext'
import { saveBudget, deleteBudget } from '../services/budgetService'
import { errorMessage, formatAmountInput, formatRupiah, parseAmount } from '../utils/format'
import { monthLabel } from '../utils/date'
import { AlertCircle } from 'lucide-react'

export function BudgetForm({
  month,
  year,
  budget,
  onClose,
  onSaved
}: {
  month: number
  year: number
  budget: Budget | null
  onClose: () => void
  onSaved: () => void
}) {
  const { session } = useAuth()
  const toast = useToast()

  const [targetIncome, setTargetIncome] = useState(formatAmountInput(budget ? String(budget.target_income || 0) : ''))
  const [expenseBudget, setExpenseBudget] = useState(formatAmountInput(budget ? String(budget.amount || 0) : ''))
  const [plannedSavings, setPlannedSavings] = useState(formatAmountInput(budget ? String(budget.planned_savings || 0) : ''))
  const [plannedEmergency, setPlannedEmergency] = useState(formatAmountInput(budget ? String(budget.planned_emergency || 0) : ''))

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  // Calculate remaining plan preview
  const numTarget = Number(targetIncome.replace(/\D/g, '') || 0)
  const numExpense = Number(expenseBudget.replace(/\D/g, '') || 0)
  const numSavings = Number(plannedSavings.replace(/\D/g, '') || 0)
  const numEmergency = Number(plannedEmergency.replace(/\D/g, '') || 0)
  const unallocated = numTarget - (numExpense + numSavings + numEmergency)
  const isDeficit = unallocated < 0

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!session || busy) return
    setBusy(true)
    setError(null)
    try {
      const cleanTarget = numTarget > 0 ? parseAmount(targetIncome) : 0
      const cleanExpense = numExpense > 0 ? parseAmount(expenseBudget) : 0
      const cleanSavings = numSavings > 0 ? parseAmount(plannedSavings) : 0
      const cleanEmergency = numEmergency > 0 ? parseAmount(plannedEmergency) : 0

      if (cleanTarget === 0 && cleanExpense === 0 && cleanSavings === 0 && cleanEmergency === 0) {
        throw new Error('Isi setidaknya satu rencana nominal.')
      }

      await saveBudget(
        session.user.id,
        month,
        year,
        cleanExpense,
        cleanTarget,
        cleanSavings,
        cleanEmergency
      )
      onSaved()
      toast('Rencana bulanan berhasil disimpan')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!session || !budget || busy) return
    setBusy(true)
    try {
      await deleteBudget(session.user.id, budget.id)
      onSaved()
      toast('Rencana bulanan berhasil dihapus')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Modal title={`Rencana ${monthLabel(month, year)}`} onClose={onClose} busy={busy}>
        <form className="form-stack" onSubmit={submit}>
          <p className="muted text-sm">
            Bagi rencana pendapatan Kamu menjadi alokasi pengeluaran, tabungan, dan dana darurat.
          </p>

          <div className="field">
            <label htmlFor="target-income">Target pemasukan yang diharapkan</label>
            <MoneyInput id="target-income" value={targetIncome} onChange={setTargetIncome} disabled={busy} large />
            <small className="hint">Target adalah rencana, bukan transaksi pemasukan aktual.</small>
          </div>

          <div className="field">
            <label htmlFor="budget-amount">Anggaran total pengeluaran</label>
            <MoneyInput id="budget-amount" value={expenseBudget} onChange={setExpenseBudget} disabled={busy} large />
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="planned-savings">Rencana tabungan</label>
              <MoneyInput id="planned-savings" value={plannedSavings} onChange={setPlannedSavings} disabled={busy} />
            </div>
            <div className="field">
              <label htmlFor="planned-emergency">Rencana dana darurat</label>
              <MoneyInput id="planned-emergency" value={plannedEmergency} onChange={setPlannedEmergency} disabled={busy} />
            </div>
          </div>

          {/* Sisa Rencana Belum Dialokasikan Preview */}
          <div className={`plan-summary-box ${isDeficit ? 'deficit' : ''}`}>
            <div className="plan-summary-row">
              <span>Sisa rencana belum dialokasikan:</span>
              <strong>{isDeficit ? `- ${formatRupiah(Math.abs(unallocated))}` : formatRupiah(unallocated)}</strong>
            </div>
            {isDeficit && (
              <p className="plan-deficit-alert">
                <AlertCircle size={15} /> Rencana alokasi melebihi target pemasukan (defisit anggaran).
              </p>
            )}
          </div>

          {error && <p role="alert" className="form-error">{error}</p>}

          <button className="button primary full" disabled={busy}>
            {busy ? 'Menyimpan…' : 'Simpan rencana'}
          </button>

          {budget && (
            <button
              className="text-button destructive"
              type="button"
              disabled={busy}
              onClick={() => setConfirm(true)}
            >
              Hapus rencana bulan ini
            </button>
          )}
        </form>
      </Modal>

      {confirm && (
        <Confirm
          title="Hapus rencana bulanan?"
          description="Catatan pengeluaran dan pemasukan aktual Kamu tetap tersimpan aman."
          onClose={() => setConfirm(false)}
          onConfirm={remove}
          busy={busy}
        />
      )}
    </>
  )
}
