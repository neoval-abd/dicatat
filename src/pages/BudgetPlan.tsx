import { useState } from 'react'
import {
  CalendarDays,
  Plus,
  Pencil,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Receipt,
  PiggyBank,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Wallet
} from 'lucide-react'
import type { Budget, BudgetAllocation, Category } from '../types'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { getBudget, getBudgetAllocations } from '../services/budgetService'
import { getFinanceSummary } from '../services/transactionService'
import { formatRupiah } from '../utils/format'
import { monthLabel, monthRange, localDate } from '../utils/date'
import { CategoryIcon } from '../components/CategoryIcon'
import { EmptyState, ErrorState, Loading } from '../components/ui/States'
import { CategoryAllocationForm } from '../components/CategoryAllocationForm'

export default function BudgetPlan({
  categories,
  revision,
  onEditBudget
}: {
  categories: Category[]
  revision: number
  onEditBudget: (budget: Budget | null, month: number, year: number) => void
}) {
  const { session } = useAuth()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear()
  })
  const [editingAllocation, setEditingAllocation] = useState<BudgetAllocation | null | 'new'>(null)

  const range = monthRange(selectedMonth.month, selectedMonth.year)
  const today = localDate()

  function changeMonth(delta: number) {
    let newMonth = selectedMonth.month + delta
    let newYear = selectedMonth.year
    if (newMonth < 1) {
      newMonth = 12
      newYear -= 1
    } else if (newMonth > 12) {
      newMonth = 1
      newYear += 1
    }
    setSelectedMonth({ month: newMonth, year: newYear })
  }

  const { data, loading, error, retry } = useAsync(async () => {
    const [budget, finance] = await Promise.all([
      getBudget(session!.user.id, selectedMonth.month, selectedMonth.year),
      getFinanceSummary(range.start, range.end, today)
    ])

    let allocations: BudgetAllocation[] = []
    if (budget) {
      allocations = await getBudgetAllocations(budget.id)
    }

    return { budget, finance, allocations }
  }, [session!.user.id, revision, selectedMonth.month, selectedMonth.year])

  if (loading) return <Loading text="Menyiapkan rencana bulanan…" />
  if (error || !data) return <ErrorState message={error || 'Data tidak dapat dimuat.'} retry={retry} />

  const { budget, finance, allocations } = data
  const targetIncome = budget?.target_income || 0
  const expenseBudget = budget?.amount || 0
  const plannedSavings = budget?.planned_savings || 0
  const plannedEmergency = budget?.planned_emergency || 0

  const totalAllocated = expenseBudget + plannedSavings + plannedEmergency
  const unallocated = targetIncome - totalAllocated
  const isDeficit = unallocated < 0

  // Map category actual expenses
  const actualByCategory: Record<string, number> = {}
  for (const c of finance.expense_categories || []) {
    actualByCategory[c.id] = c.total
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">PERENCANAAN KEUANGAN BULANAN</p>
        <h1>Rencana Bulanan</h1>
        <p className="muted">Bagi pendapatan yang diharapkan ke dalam alokasi terarah.</p>
      </div>

      {/* Month Navigation */}
      <div className="month-selector-bar">
        <button
          className="button secondary icon-only"
          onClick={() => changeMonth(-1)}
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="month-selector-label">
          <CalendarDays size={18} />
          <strong>{monthLabel(selectedMonth.month, selectedMonth.year)}</strong>
        </div>
        <button
          className="button secondary icon-only"
          onClick={() => changeMonth(1)}
          aria-label="Bulan berikutnya"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Financial Plan Card */}
      <section className="card plan-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ALOKASI PENDAPATAN</span>
            <h2>Rencana Keuangan</h2>
          </div>
          <button
            className="button secondary text-sm"
            onClick={() => onEditBudget(budget, selectedMonth.month, selectedMonth.year)}
          >
            <Pencil size={15} /> {budget ? 'Ubah rencana' : 'Atur rencana'}
          </button>
        </div>

        {budget ? (
          <div className="plan-grid-details">
            <div className="plan-item">
              <span className="plan-item-label">
                <TrendingUp size={16} className="text-green-600" /> Target pemasukan
              </span>
              <strong>{formatRupiah(targetIncome)}</strong>
              <small className="muted">Nilai yang direncanakan</small>
            </div>
            <div className="plan-item">
              <span className="plan-item-label">
                <Receipt size={16} className="text-amber-600" /> Anggaran pengeluaran
              </span>
              <strong>{formatRupiah(expenseBudget)}</strong>
              <small className="muted">Batas belanja bulanan</small>
            </div>
            <div className="plan-item">
              <span className="plan-item-label">
                <PiggyBank size={16} className="text-blue-600" /> Rencana tabungan
              </span>
              <strong>{formatRupiah(plannedSavings)}</strong>
              <small className="muted">Alokasi tujuan finansial</small>
            </div>
            <div className="plan-item">
              <span className="plan-item-label">
                <ShieldAlert size={16} className="text-purple-600" /> Rencana dana darurat
              </span>
              <strong>{formatRupiah(plannedEmergency)}</strong>
              <small className="muted">Jaring pengaman</small>
            </div>

            {/* Sisa Rencana Belum Dialokasikan */}
            <div className={`plan-unallocated-box ${isDeficit ? 'deficit' : ''}`}>
              <div className="unallocated-top">
                <span>Sisa rencana belum dialokasikan</span>
                <strong>
                  {isDeficit ? `- ${formatRupiah(Math.abs(unallocated))}` : formatRupiah(unallocated)}
                </strong>
              </div>
              <p className="unallocated-note">
                {isDeficit ? (
                  <>
                    <AlertCircle size={15} /> Alokasi melebihi target pemasukan sebesar {formatRupiah(Math.abs(unallocated))}. Sesuaikan rencana Kamu agar tidak defisit.
                  </>
                ) : unallocated === 0 ? (
                  <>
                    <CheckCircle2 size={15} /> Rencana teralokasi seimbang 100% (Zero-based budgeting).
                  </>
                ) : (
                  <>
                    Masih ada {formatRupiah(unallocated)} yang belum dialokasikan untuk tabungan atau kebutuhan lain.
                  </>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="plan-empty-state">
            <Wallet size={36} className="muted" />
            <p>Belum ada rencana keuangan untuk {monthLabel(selectedMonth.month, selectedMonth.year)}.</p>
            <button
              className="button primary"
              onClick={() => onEditBudget(null, selectedMonth.month, selectedMonth.year)}
            >
              <Plus size={16} /> Buat rencana bulanan
            </button>
          </div>
        )}
      </section>

      {/* Category Budget Allocations */}
      <section className="card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BATAS PER KATEGORI</span>
            <h2>Anggaran Pengeluaran Kategori</h2>
          </div>
          {budget && (
            <button className="text-button" onClick={() => setEditingAllocation('new')}>
              <Plus size={15} /> Tambah batas
            </button>
          )}
        </div>

        {!budget ? (
          <p className="muted text-sm py-4">
            Atur rencana bulanan terlebih dahulu untuk menambahkan batas per kategori.
          </p>
        ) : allocations.length ? (
          <div className="category-allocation-list">
            {allocations.map(alloc => {
              const actual = actualByCategory[alloc.category_id] || 0
              const progress = alloc.amount > 0 ? (actual / alloc.amount) * 100 : 0
              const remaining = alloc.amount - actual
              const isOver = remaining < 0

              return (
                <div
                  key={alloc.id}
                  className="category-allocation-item"
                  onClick={() => setEditingAllocation(alloc)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="allocation-header">
                    <div className="allocation-info">
                      <CategoryIcon icon={alloc.category?.icon || 'Shapes'} size={20} />
                      <div>
                        <strong>{alloc.category?.name || 'Kategori'}</strong>
                        {alloc.notes && <small className="muted">{alloc.notes}</small>}
                      </div>
                    </div>
                    <div className="allocation-amounts">
                      <span>
                        Anggaran <b>{formatRupiah(alloc.amount)}</b>
                      </span>
                      <small className={isOver ? 'destructive' : 'muted'}>
                        {isOver ? 'Melebihi' : 'Terpakai'} {formatRupiah(actual)} ({Math.round(progress)}%)
                      </small>
                    </div>
                  </div>

                  <div
                    className={`budget-progress ${isOver ? 'over' : ''}`}
                    role="progressbar"
                    aria-valuenow={Math.min(100, Math.round(progress))}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${Math.min(100, progress)}%` }} />
                  </div>

                  <div className={`allocation-footer ${isOver ? 'destructive' : ''}`}>
                    <span>
                      {isOver ? 'Over budget:' : 'Sisa:'} <b>{formatRupiah(Math.abs(remaining))}</b>
                    </span>
                    <button
                      className="text-button"
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        setEditingAllocation(alloc)
                      }}
                      aria-label={`Ubah batas ${alloc.category?.name}`}
                    >
                      <Pencil size={13} /> Ubah
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            title="Belum ada batas per kategori"
            description="Tentukan batas pengeluaran spesifik untuk makanan, transportasi, belanja, dll."
            action={
              <button className="button secondary" onClick={() => setEditingAllocation('new')}>
                <Plus size={16} /> Atur batas kategori
              </button>
            }
          />
        )}
      </section>

      {/* Comparison: Plan vs Actual */}
      {budget && (
        <section className="card plan-comparison-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EVALUASI BULAN INI</span>
              <h2>Rencana vs Realisasi</h2>
            </div>
            <span className="pill">Realisasi Aktual</span>
          </div>

          <div className="comparison-list">
            <div className="comparison-row">
              <div>
                <span>Pemasukan</span>
                <small className="muted">Target: {formatRupiah(targetIncome)}</small>
              </div>
              <div className="comparison-val">
                <strong>{formatRupiah(finance.income_total)}</strong>
                <small
                  className={
                    finance.income_total >= targetIncome ? 'text-green-600' : 'text-amber-600'
                  }
                >
                  {targetIncome > 0
                    ? `${Math.round((finance.income_total / targetIncome) * 100)}% tercapai`
                    : 'Aktual'}
                </small>
              </div>
            </div>

            <div className="comparison-row">
              <div>
                <span>Pengeluaran</span>
                <small className="muted">Batas: {formatRupiah(expenseBudget)}</small>
              </div>
              <div className="comparison-val">
                <strong className={finance.expense_total > expenseBudget && expenseBudget > 0 ? 'destructive' : ''}>
                  {formatRupiah(finance.expense_total)}
                </strong>
                <small className={finance.expense_total > expenseBudget && expenseBudget > 0 ? 'destructive' : 'muted'}>
                  {expenseBudget > 0
                    ? `${Math.round((finance.expense_total / expenseBudget) * 100)}% terpakai`
                    : 'Aktual'}
                </small>
              </div>
            </div>

            <div className="comparison-row">
              <div>
                <span>Setoran Tabungan</span>
                <small className="muted">Rencana: {formatRupiah(plannedSavings + plannedEmergency)}</small>
              </div>
              <div className="comparison-val">
                <strong>{formatRupiah(finance.savings_deposit)}</strong>
                <small className="muted">Tercatat di tabungan</small>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category Allocation Modal */}
      {editingAllocation && budget && (
        <CategoryAllocationForm
          monthlyBudgetId={budget.id}
          allocation={editingAllocation === 'new' ? null : editingAllocation}
          categories={categories}
          existingCategoryIds={allocations.map(a => a.category_id)}
          onClose={() => setEditingAllocation(null)}
          onSaved={() => {
            setEditingAllocation(null)
            retry()
          }}
        />
      )}
    </div>
  )
}
