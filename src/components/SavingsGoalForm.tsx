import { useState, type FormEvent } from 'react'
import type { GoalType, SavingsGoal } from '../types'
import { Modal, Confirm } from './ui/Modal'
import { MoneyInput } from './ui/MoneyInput'
import { useToast } from './ui/Toast'
import { useAuth } from '../context/AuthContext'
import { saveSavingsGoal, deleteSavingsGoal, archiveSavingsGoal } from '../services/savingsService'
import { errorMessage, formatAmountInput, parseAmount } from '../utils/format'
import { CategoryIcon } from './CategoryIcon'
import { EmergencyCalculatorModal } from './EmergencyCalculatorModal'
import { Calculator, Archive, ArchiveRestore, Trash2 } from 'lucide-react'

const goalTypes: { id: GoalType; label: string }[] = [
  { id: 'emergency_fund', label: 'Dana Darurat' },
  { id: 'general_savings', label: 'Tabungan Umum' },
  { id: 'short_term_goal', label: 'Target Jangka Pendek' },
  { id: 'other', label: 'Tujuan Lainnya' }
]

const goalIconKeys = [
  'PiggyBank', 'ShieldAlert', 'Target', 'HeartHandshake', 'Laptop',
  'Plane', 'House', 'Car', 'Briefcase', 'GraduationCap', 'Gem', 'Trophy'
]

export function SavingsGoalForm({
  goal,
  onClose,
  onSaved
}: {
  goal?: SavingsGoal | null
  onClose: () => void
  onSaved: () => void
}) {
  const { session } = useAuth()
  const toast = useToast()

  const [name, setName] = useState(goal?.name || '')
  const [goalType, setGoalType] = useState<GoalType>(goal?.goal_type || 'general_savings')
  const [targetAmount, setTargetAmount] = useState(formatAmountInput(goal ? String(goal.target_amount) : ''))
  const [openingAmount, setOpeningAmount] = useState(formatAmountInput(goal ? String(goal.opening_amount) : '0'))
  const [targetDate, setTargetDate] = useState(goal?.target_date || '')
  const [icon, setIcon] = useState(goal?.icon || (goalType === 'emergency_fund' ? 'ShieldAlert' : 'PiggyBank'))
  const [notes, setNotes] = useState(goal?.notes || '')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)

  // Auto-switch icon if emergency fund is selected
  function handleTypeChange(newType: GoalType) {
    setGoalType(newType)
    if (newType === 'emergency_fund' && icon === 'PiggyBank') {
      setIcon('ShieldAlert')
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!session || busy) return
    setBusy(true)
    setError(null)
    try {
      const cleanTarget = parseAmount(targetAmount)
      const cleanOpening = openingAmount ? parseAmount(openingAmount) : 0

      await saveSavingsGoal(
        session.user.id,
        {
          name,
          goal_type: goalType,
          target_amount: cleanTarget,
          opening_amount: cleanOpening,
          target_date: targetDate || null,
          icon,
          notes
        },
        goal?.id
      )
      onSaved()
      toast(`Tujuan tabungan berhasil ${goal ? 'diubah' : 'dibuat'}`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!session || !goal || busy) return
    setBusy(true)
    try {
      await deleteSavingsGoal(session.user.id, goal.id)
      onSaved()
      toast('Tujuan tabungan berhasil dihapus')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function toggleArchive() {
    if (!session || !goal || busy) return
    setBusy(true)
    try {
      await archiveSavingsGoal(session.user.id, goal.id, !goal.is_archived)
      onSaved()
      toast(goal.is_archived ? 'Tujuan tabungan diaktifkan kembali' : 'Tujuan tabungan diarsipkan')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Modal
        title={goal ? 'Edit tujuan tabungan' : 'Tujuan tabungan baru'}
        onClose={onClose}
        busy={busy}
      >
        <form className="form-stack" onSubmit={submit}>
          <div className="field">
            <label htmlFor="goal-name">Nama tujuan</label>
            <input
              id="goal-name"
              required
              maxLength={100}
              placeholder="Misal: Dana Darurat, Beli Laptop, Liburan..."
              value={name}
              disabled={busy}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="goal-type">Jenis tujuan</label>
            <select
              id="goal-type"
              value={goalType}
              disabled={busy}
              onChange={e => handleTypeChange(e.target.value as GoalType)}
            >
              {goalTypes.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {goalType === 'emergency_fund' && (
            <button
              type="button"
              className="button secondary text-sm full"
              onClick={() => setShowCalculator(true)}
            >
              <Calculator size={16} /> Buka Kalkulator Dana Darurat
            </button>
          )}

          <div className="field">
            <label htmlFor="goal-target">Target nominal</label>
            <MoneyInput id="goal-target" value={targetAmount} onChange={setTargetAmount} disabled={busy} large />
          </div>

          <div className="field">
            <label htmlFor="goal-opening">
              Saldo awal <small>jika sudah ada simpanan</small>
            </label>
            <MoneyInput id="goal-opening" value={openingAmount} onChange={setOpeningAmount} disabled={busy} />
          </div>

          <div className="field">
            <label htmlFor="goal-date">
              Target tanggal <small>opsional, untuk hitung saran setoran</small>
            </label>
            <input
              id="goal-date"
              type="date"
              value={targetDate}
              disabled={busy}
              onChange={e => setTargetDate(e.target.value)}
            />
          </div>

          <div className="field">
            <span className="field-label">Ikon tujuan</span>
            <div className="icon-picker">
              {goalIconKeys.map(key => (
                <button
                  key={key}
                  type="button"
                  className={key === icon ? 'selected' : ''}
                  aria-label={`Pilih ikon ${key}`}
                  disabled={busy}
                  onClick={() => setIcon(key)}
                >
                  <CategoryIcon icon={key} />
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="goal-notes">
              Catatan <small>opsional</small>
            </label>
            <textarea
              id="goal-notes"
              rows={2}
              maxLength={2000}
              placeholder="Rencana atau motivasi untuk tabungan ini..."
              value={notes}
              disabled={busy}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {error && <p role="alert" className="form-error">{error}</p>}

          <button className="button primary full" disabled={busy}>
            {busy ? 'Menyimpan…' : goal ? 'Simpan perubahan' : 'Buat tujuan tabungan'}
          </button>

          {goal && (
            <div className="button-row mt-2">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={toggleArchive}
              >
                {goal.is_archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                {goal.is_archived ? 'Aktifkan kembali' : 'Arsipkan tujuan'}
              </button>
              <button
                type="button"
                className="button secondary destructive"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={16} /> Hapus
              </button>
            </div>
          )}
        </form>
      </Modal>

      {showCalculator && (
        <EmergencyCalculatorModal
          onClose={() => setShowCalculator(false)}
          onApply={calculated => {
            setTargetAmount(formatAmountInput(String(calculated)))
            toast('Target dana darurat diterapkan ke form')
          }}
        />
      )}

      {confirmDelete && (
        <Confirm
          title="Hapus tujuan tabungan?"
          description="Tujuan tabungan dan seluruh riwayat pergerakan tabungan ini akan dihapus. Pengeluaran atau pemasukan aktual tidak akan terpengaruh."
          onClose={() => setConfirmDelete(false)}
          onConfirm={remove}
          busy={busy}
        />
      )}
    </>
  )
}
