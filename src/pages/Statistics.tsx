import { useState } from 'react'
import {
  Wallet,
  CalendarDays,
  ReceiptText,
  TrendingUp,
  Scale,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { getFinanceSummary } from '../services/transactionService'
import { getBudget } from '../services/budgetService'
import { monthRange, localDate, monthLabel } from '../utils/date'
import { formatRupiah } from '../utils/format'
import { CategoryBreakdown } from '../components/CategoryBreakdown'
import { EmptyState, Loading, ErrorState } from '../components/ui/States'
import type { Budget } from '../types'

export default function Statistics({
  revision,
  onBudget
}: {
  revision: number
  onBudget: (budget: Budget | null, month: number, year: number) => void
}) {
  const { session } = useAuth()
  const now = new Date()
  const [selected, setSelected] = useState(localDate().slice(0, 7))
  const [statTab, setStatTab] = useState<'overview' | 'expense' | 'income' | 'savings'>('overview')

  const [year, month] = selected.split('-').map(Number)
  const range = monthRange(month, year)

  const { data, loading, error, retry } = useAsync(async () => {
    const [finance, budget] = await Promise.all([
      getFinanceSummary(range.start, range.end, localDate()),
      getBudget(session!.user.id, month, year)
    ])
    return { finance, budget }
  }, [session!.user.id, revision, selected])

  const days =
    month === now.getMonth() + 1 && year === now.getFullYear()
      ? now.getDate()
      : new Date(year, month, 0).getDate()

  const dailyExpenseAvg = Math.round((data?.finance.expense_total || 0) / Math.max(1, days))

  const income = data?.finance.income_total || 0
  const expense = data?.finance.expense_total || 0
  const savingsDeposit = data?.finance.savings_deposit || 0
  const savingsWithdrawal = data?.finance.savings_withdrawal || 0
  const netSavings = savingsDeposit - savingsWithdrawal
  const netCashflow = income - expense - netSavings

  // Total comparison bar proportions
  const maxFlow = Math.max(income, expense, 1)
  const incomeBarWidth = Math.min(100, Math.round((income / maxFlow) * 100))
  const expenseBarWidth = Math.min(100, Math.round((expense / maxFlow) * 100))

  return (
    <div className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">ANALISIS & STATISTIK</p>
        <h1>Laporan Keuangan</h1>
        <p className="muted">Analisis pemasukan, belanja, dan perkembangan tabungan bulanan.</p>
      </div>

      {/* Month picker */}
      <div className="month-picker">
        <label htmlFor="stat-month">Periode Bulan</label>
        <input
          id="stat-month"
          type="month"
          min="0001-01"
          max="9999-12"
          required
          value={selected}
          onChange={e => {
            if (/^\d{4}-\d{2}$/.test(e.target.value)) setSelected(e.target.value)
          }}
        />
      </div>

      {/* Statistics view tabs */}
      <div className="type-filter-tabs" role="tablist">
        <button
          className={`type-tab ${statTab === 'overview' ? 'active' : ''}`}
          onClick={() => setStatTab('overview')}
        >
          Ringkasan
        </button>
        <button
          className={`type-tab ${statTab === 'expense' ? 'active' : ''}`}
          onClick={() => setStatTab('expense')}
        >
          Pengeluaran
        </button>
        <button
          className={`type-tab ${statTab === 'income' ? 'active' : ''}`}
          onClick={() => setStatTab('income')}
        >
          Pemasukan
        </button>
        <button
          className={`type-tab ${statTab === 'savings' ? 'active' : ''}`}
          onClick={() => setStatTab('savings')}
        >
          Tabungan
        </button>
      </div>

      {loading ? (
        <Loading text="Menghitung statistik…" />
      ) : error || !data ? (
        <ErrorState message={error || 'Data tidak dapat dimuat.'} retry={retry} />
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {statTab === 'overview' && (
            <>
              {/* Cashflow Comparison Card */}
              <section className="card">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">ARUS KAS {monthLabel(month, year).toUpperCase()}</span>
                    <h2>Perbandingan Pemasukan & Belanja</h2>
                  </div>
                  <Scale size={18} className="text-muted" />
                </div>

                <div className="stat-comparison-bars">
                  <div className="comparison-bar-group">
                    <div className="bar-label-row">
                      <span className="flex-row items-center gap-1">
                        <ArrowDownLeft size={14} className="text-green-600" /> Pemasukan Aktual
                      </span>
                      <strong className="text-green-600">{formatRupiah(income)}</strong>
                    </div>
                    <div className="bar-track income-track">
                      <span style={{ width: `${incomeBarWidth}%` }} />
                    </div>
                  </div>

                  <div className="comparison-bar-group mt-3">
                    <div className="bar-label-row">
                      <span className="flex-row items-center gap-1">
                        <ArrowUpRight size={14} className="text-amber-600" /> Pengeluaran Belanja
                      </span>
                      <strong>{formatRupiah(expense)}</strong>
                    </div>
                    <div className="bar-track expense-track">
                      <span style={{ width: `${expenseBarWidth}%` }} />
                    </div>
                  </div>
                </div>

                <div className="net-cashflow-callout mt-4">
                  <div>
                    <span>Arus kas operasional:</span>
                    <strong>{formatRupiah(income - expense)}</strong>
                  </div>
                  <div className="text-right">
                    <span>Sisa setelah tabungan:</span>
                    <strong className={netCashflow < 0 ? 'destructive' : ''}>
                      {formatRupiah(netCashflow)}
                    </strong>
                  </div>
                </div>
              </section>

              {/* Stat Quick Cards */}
              <div className="stat-grid">
                <div className="card stat-small">
                  <CalendarDays size={20} />
                  <span>Rata-rata belanja / hari</span>
                  <strong>{formatRupiah(dailyExpenseAvg)}</strong>
                  <small>
                    {days} hari {month === now.getMonth() + 1 && year === now.getFullYear() ? 'berjalan' : 'dalam bulan'}
                  </small>
                </div>
                <div className="card stat-small">
                  <ReceiptText size={20} />
                  <span>Aktivitas transaksi</span>
                  <strong>{data.finance.expense_count + data.finance.income_count}</strong>
                  <small>
                    {data.finance.expense_count} belanja · {data.finance.income_count} pemasukan
                  </small>
                </div>
              </div>

              {/* Monthly Budget Reference */}
              <section className="card stat-budget">
                <div>
                  <Wallet size={22} />
                  <h3>{data.budget ? 'Budget belanja bulan ini' : 'Beri belanja Kamu batas'}</h3>
                  <p className="muted">
                    {data.budget
                      ? `${formatRupiah(data.budget.amount)} · ${
                          data.budget.amount > 0
                            ? Math.round((expense / data.budget.amount) * 100)
                            : 0
                        }% terpakai`
                      : 'Atur budget bulanan agar belanja tetap terkontrol.'}
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => onBudget(data.budget, month, year)}
                >
                  {data.budget ? 'Ubah budget' : 'Atur budget'}
                </button>
              </section>
            </>
          )}

          {/* TAB 2: EXPENSES */}
          {statTab === 'expense' && (
            <>
              <section className="stat-total">
                <span>
                  <Wallet size={18} /> Pengeluaran {monthLabel(month, year)}
                </span>
                <h2>{formatRupiah(expense)}</h2>
                <p>{data.finance.expense_count} transaksi belanja</p>
              </section>

              <section className="card">
                <div className="section-heading">
                  <h2>Pengeluaran per kategori</h2>
                  <span className="pill">{data.finance.expense_categories.length} Kategori</span>
                </div>
                {data.finance.expense_categories.length ? (
                  <CategoryBreakdown
                    categories={data.finance.expense_categories}
                    total={expense}
                  />
                ) : (
                  <EmptyState
                    title="Belum ada transaksi belanja"
                    description="Belum ada data pengeluaran yang tercatat pada bulan ini."
                  />
                )}
              </section>
            </>
          )}

          {/* TAB 3: INCOME */}
          {statTab === 'income' && (
            <>
              <section className="stat-total income-total-banner">
                <span>
                  <TrendingUp size={18} /> Pemasukan {monthLabel(month, year)}
                </span>
                <h2>{formatRupiah(income)}</h2>
                <p>{data.finance.income_count} kali pemasukan</p>
              </section>

              <section className="card">
                <div className="section-heading">
                  <h2>Pemasukan per kategori</h2>
                  <span className="pill">{data.finance.income_categories.length} Kategori</span>
                </div>
                {data.finance.income_categories.length ? (
                  <CategoryBreakdown
                    categories={data.finance.income_categories}
                    total={income}
                  />
                ) : (
                  <EmptyState
                    title="Belum ada pemasukan tercatat"
                    description="Catat pemasukan bulan ini untuk melihat sumber pendapatan Kamu."
                  />
                )}
              </section>
            </>
          )}

          {/* TAB 4: SAVINGS */}
          {statTab === 'savings' && (
            <>
              <section className="stat-total savings-total-banner">
                <span>
                  <PiggyBank size={18} /> Pergerakan Tabungan {monthLabel(month, year)}
                </span>
                <h2>{formatRupiah(netSavings)}</h2>
                <p>
                  +{formatRupiah(savingsDeposit)} setoran · -{formatRupiah(savingsWithdrawal)} penarikan
                </p>
              </section>

              <section className="card">
                <div className="section-heading">
                  <h2>Aktivitas Tabungan Bulan Ini</h2>
                  <span className="pill">Terpisah dari Belanja</span>
                </div>
                <div className="savings-stat-breakdown">
                  <div className="stat-detail-item">
                    <span>Total setoran tabungan</span>
                    <strong className="text-green-600">+{formatRupiah(savingsDeposit)}</strong>
                  </div>
                  <div className="stat-detail-item">
                    <span>Total penarikan tabungan</span>
                    <strong className="text-amber-600">-{formatRupiah(savingsWithdrawal)}</strong>
                  </div>
                  <div className="stat-detail-item border-t pt-2">
                    <span>Perubahan bersih tabungan bulan ini</span>
                    <strong>{formatRupiah(netSavings)}</strong>
                  </div>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
