import { useState, type FormEvent } from 'react'
import type { Budget } from '../types'
import { Modal, Confirm } from './ui/Modal'
import { MoneyInput } from './ui/MoneyInput'
import { useToast } from './ui/Toast'
import { useAuth } from '../context/AuthContext'
import { saveBudget, deleteBudget } from '../services/budgetService'
import { errorMessage, formatAmountInput, parseAmount } from '../utils/format'
import { monthLabel } from '../utils/date'
export function BudgetForm({ month, year, budget, onClose, onSaved }: { month: number; year: number; budget: Budget | null; onClose: () => void; onSaved: () => void }) {
  const { session } = useAuth(), toast = useToast()
  const [amount, setAmount] = useState(formatAmountInput(budget ? String(budget.amount) : ''))
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [confirm, setConfirm] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!session || busy) return
    setBusy(true); setError(null)
    try { await saveBudget(session.user.id, month, year, parseAmount(amount)); onSaved(); toast('Budget berhasil disimpan') }
    catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  async function remove() {
    if (!session || !budget || busy) return
    setBusy(true)
    try { await deleteBudget(session.user.id, budget.id); onSaved(); toast('Budget berhasil dihapus') }
    catch (error) { toast(errorMessage(error), 'error') } finally { setBusy(false) }
  }
  return <><Modal title="Budget bulanan" onClose={onClose} busy={busy}><form className="form-stack" onSubmit={submit}>
    <p className="muted">Atur batas pengeluaran untuk {monthLabel(month, year)}.</p>
    <div className="field"><label htmlFor="budget-amount">Nominal budget</label><MoneyInput id="budget-amount" value={amount} onChange={setAmount} disabled={busy} large /></div>
    {error && <p role="alert" className="form-error">{error}</p>}
    <button className="button primary full" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan budget'}</button>
    {budget && <button className="text-button destructive" type="button" disabled={busy} onClick={() => setConfirm(true)}>Hapus budget bulan ini</button>}
  </form></Modal>{confirm && <Confirm title="Hapus budget?" description="Catatan pengeluaran Kamu tetap tersimpan." onClose={() => setConfirm(false)} onConfirm={remove} busy={busy} />}</>
}
