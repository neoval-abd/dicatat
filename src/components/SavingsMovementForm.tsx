import { useState, type FormEvent } from 'react'
import type { MovementType, SavingsGoalWithBalance, SavingsMovement } from '../types'
import { Modal } from './ui/Modal'
import { MoneyInput } from './ui/MoneyInput'
import { useToast } from './ui/Toast'
import { useAuth } from '../context/AuthContext'
import { saveSavingsMovement } from '../services/savingsService'
import { localDate } from '../utils/date'
import { errorMessage, formatAmountInput, parseAmount } from '../utils/format'
import { Info, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

export function SavingsMovementForm({
  goals,
  selectedGoalId,
  initialType = 'deposit',
  movement,
  onClose,
  onSaved
}: {
  goals: SavingsGoalWithBalance[]
  selectedGoalId?: string
  initialType?: MovementType
  movement?: SavingsMovement | null
  onClose: () => void
  onSaved: () => void
}) {
  const { session } = useAuth()
  const toast = useToast()

  const [goalId, setGoalId] = useState(movement?.goal_id || selectedGoalId || goals[0]?.id || '')
  const [movementType, setMovementType] = useState<MovementType>(movement?.movement_type || initialType)
  const [amount, setAmount] = useState(formatAmountInput(movement ? String(movement.amount) : ''))
  const [movementDate, setMovementDate] = useState(movement?.movement_date || localDate())
  const [note, setNote] = useState(movement?.note || '')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDeposit = movementType === 'deposit'

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!session || busy) return
    setBusy(true)
    setError(null)
    try {
      const cleanAmount = parseAmount(amount)
      if (!goalId) throw new Error('Pilih tujuan tabungan.')

      await saveSavingsMovement(
        session.user.id,
        {
          goal_id: goalId,
          movement_type: movementType,
          amount: cleanAmount,
          movement_date: movementDate,
          note
        },
        movement?.id
      )
      onSaved()
      const label = isDeposit ? 'Setoran tabungan' : 'Penarikan tabungan'
      toast(`${label} berhasil dicatat`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={isDeposit ? 'Catat setoran tabungan' : 'Catat penarikan tabungan'}
      onClose={onClose}
      busy={busy}
    >
      <form className="form-stack" onSubmit={submit}>
        {/* Toggle deposit / withdrawal */}
        {!movement && (
          <div className="type-toggle-grid" role="group" aria-label="Jenis Pergerakan">
            <button
              type="button"
              className={`type-toggle-btn income ${movementType === 'deposit' ? 'selected' : ''}`}
              onClick={() => setMovementType('deposit')}
            >
              <ArrowDownLeft size={17} />
              <span>Setor Tabungan</span>
            </button>
            <button
              type="button"
              className={`type-toggle-btn expense ${movementType === 'withdrawal' ? 'selected' : ''}`}
              onClick={() => setMovementType('withdrawal')}
            >
              <ArrowUpRight size={17} />
              <span>Tarik Tabungan</span>
            </button>
          </div>
        )}

        <div className="info-banner" role="note">
          <Info size={16} />
          <span>
            Pencatatan ini mencatat alokasi tabungan secara manual dan tidak memverifikasi rekening bank.
            Pergerakan tabungan tidak dimasukkan sebagai pengeluaran maupun pemasukan belanja.
          </span>
        </div>

        <div className="field">
          <label htmlFor="mov-goal">Tujuan tabungan</label>
          <select
            id="mov-goal"
            required
            disabled={busy || !goals.length}
            value={goalId}
            onChange={e => setGoalId(e.target.value)}
          >
            <option value="" disabled>
              Pilih tujuan tabungan
            </option>
            {goals.map(g => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {!goals.length && (
            <p className="field-error">Buat tujuan tabungan terlebih dahulu sebelum mencatat setoran.</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="mov-amount">Nominal {isDeposit ? 'setoran' : 'penarikan'}</label>
          <MoneyInput id="mov-amount" value={amount} onChange={setAmount} disabled={busy} large />
        </div>

        <div className="field">
          <label htmlFor="mov-date">Tanggal</label>
          <input
            id="mov-date"
            type="date"
            required
            value={movementDate}
            disabled={busy}
            onChange={e => setMovementDate(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="mov-note">
            Catatan <small>opsional</small>
          </label>
          <input
            id="mov-note"
            type="text"
            maxLength={2000}
            placeholder={isDeposit ? 'Misal: alokasi dari gaji Oktober' : 'Alasan penarikan...'}
            value={note}
            disabled={busy}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        {error && <p role="alert" className="form-error">{error}</p>}

        <button className="button primary full" disabled={busy || !goals.length}>
          {busy ? 'Menyimpan…' : isDeposit ? 'Simpan setoran' : 'Simpan penarikan'}
        </button>
      </form>
    </Modal>
  )
}
