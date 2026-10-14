import { useState } from 'react'
import { Modal } from './ui/Modal'
import { MoneyInput } from './ui/MoneyInput'
import { formatRupiah } from '../utils/format'
import { ShieldAlert, Check } from 'lucide-react'

export function EmergencyCalculatorModal({
  initialExpense = 3000000,
  onClose,
  onApply
}: {
  initialExpense?: number
  onClose: () => void
  onApply: (calculatedTarget: number) => void
}) {
  const [monthlyExpense, setMonthlyExpense] = useState(String(initialExpense))
  const [monthsCount, setMonthsCount] = useState(6)

  const parsedExpense = Number(monthlyExpense.replace(/\D/g, '') || 0)
  const calculatedTarget = parsedExpense * monthsCount

  const monthOptions = [3, 6, 9, 12]

  function apply() {
    if (calculatedTarget > 0) {
      onApply(calculatedTarget)
      onClose()
    }
  }

  return (
    <Modal title="Kalkulator Dana Darurat" onClose={onClose}>
      <div className="form-stack">
        <div className="calculator-intro">
          <ShieldAlert size={28} className="text-amber-600" />
          <div>
            <strong>Estimasi Kebutuhan Dana Darurat</strong>
            <p className="muted text-sm">
              Tentukan target dana darurat berdasarkan pengeluaran pokok bulanan keluarga atau pribadi.
            </p>
          </div>
        </div>

        <div className="field">
          <label htmlFor="calc-expense">Estimasi pengeluaran pokok per bulan</label>
          <MoneyInput
            id="calc-expense"
            value={monthlyExpense}
            onChange={setMonthlyExpense}
            large
          />
          <small className="hint">
            Kebutuhan pokok mencakup makan, tempat tinggal, transportasi wajib, dan tagihan rutin.
          </small>
        </div>

        <div className="field">
          <span className="field-label">Target ketahanan (jumlah bulan)</span>
          <div className="calculator-month-options">
            {monthOptions.map(m => (
              <button
                key={m}
                type="button"
                className={`button secondary ${monthsCount === m ? 'selected' : ''}`}
                onClick={() => setMonthsCount(m)}
              >
                {m} Bulan
              </button>
            ))}
          </div>
          <small className="hint">
            Umumnya 3-6 bulan untuk lajang/pekerja tetap, 6-12 bulan untuk pekerja lepas atau berkeluarga.
          </small>
        </div>

        <div className="card calculator-result-card">
          <span>Target dana darurat yang disarankan:</span>
          <h2>{formatRupiah(calculatedTarget)}</h2>
          <small className="muted">
            {formatRupiah(parsedExpense)} × {monthsCount} bulan
          </small>
        </div>

        <p className="hint text-center">
          *Nilai ini merupakan estimasi perencanaan pribadi dan dapat disesuaikan kapan saja.
        </p>

        <div className="button-row">
          <button type="button" className="button secondary" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="button primary"
            disabled={calculatedTarget <= 0}
            onClick={apply}
          >
            <Check size={16} /> Gunakan target ini
          </button>
        </div>
      </div>
    </Modal>
  )
}
