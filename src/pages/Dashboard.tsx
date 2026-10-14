import {
  ArrowUpRight,
  ArrowDownLeft,
  Camera,
  Pencil,
  Leaf,
  ShieldAlert,
  TrendingUp,
  Receipt,
  Scale,
  ArrowRight,
  Info
} from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { getFinanceSummary, getTransactions } from '../services/transactionService'
import { getBudget } from '../services/budgetService'
import { getSavingsGoals } from '../services/savingsService'
import { db } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatRupiah } from '../utils/format'
import { localDate, monthRange, monthLabel } from '../utils/date'
import { TransactionList } from '../components/TransactionList'
import { CategoryBreakdown } from '../components/CategoryBreakdown'
import { EmptyState, ErrorState, Loading } from '../components/ui/States'
import type { Budget, Transaction } from '../types'

export default function Dashboard({
  revision,
  onAdd,
  onHistory,
  onSelect,
  onBudget,
  onPlan,
  onSavings
}: {
  revision: number
  onAdd: (photo?: boolean, initialType?: 'income' | 'expense') => void
  onHistory: () => void
  onSelect: (item: Transaction) => void
  onBudget: (budget: Budget | null, month: number, year: number) => void
  onPlan: () => void
  onSavings: () => void
}) {
  const { session } = useAuth()
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const today = localDate()
  const range = monthRange(month, year)

  const { data, loading, error, retry } = useAsync(async () => {
    const [finance, recent, budget, goals, profile] = await Promise.all([
      getFinanceSummary(range.start, range.end, today),
      getTransactions(session!.user.id, {}, 0, 5),
      getBudget(session!.user.id, month, year),
      getSavingsGoals(session!.user.id, false),
      db().from('profiles').select('name').eq('id', session!.user.id).maybeSingle()
    ])
    if (profile.error) throw profile.error
    return {
      finance,
      recent,
      budget,
      goals,
      name: profile.data?.name || 'Kamu'
    }
  }, [session!.user.id, revision, today])

  if (loading) return <Loading text="Menyiapkan ringkasan keuangan Kamu…" />
  if (error || !data) return <ErrorState message={error || 'Data tidak dapat dimuat.'} retry={retry} />

  const { finance, recent, budget, goals, name } = data

  const greeting =
    now.getHours() < 11
      ? 'Selamat pagi'
      : now.getHours() < 15
      ? 'Selamat siang'
      : now.getHours() < 18
      ? 'Selamat sore'
      : 'Selamat malam'

  // A. Pemasukan
  const actualIncome = finance.income_total
  const targetIncome = budget?.target_income || 0
  const incomeDiff = actualIncome - targetIncome

  // B. Pengeluaran
  const actualExpense = finance.expense_total
  const expenseBudget = budget?.amount || 0
  const remainingBudget = expenseBudget ? expenseBudget - actualExpense : 0
  const budgetProgress = expenseBudget ? (actualExpense / expenseBudget) * 100 : 0

  // C. Tabungan
  const totalSavingsDeposit = finance.savings_deposit
  const totalSavingsWithdrawal = finance.savings_withdrawal
  const netSavingsChange = totalSavingsDeposit - totalSavingsWithdrawal
  const allGoalsTotalSaved = goals.reduce((sum, g) => sum + g.current_balance, 0)

  const emergencyGoals = goals.filter(g => g.goal_type === 'emergency_fund')
  const emergencySaved = emergencyGoals.reduce((sum, g) => sum + g.current_balance, 0)
  const emergencyTarget = emergencyGoals.reduce((sum, g) => sum + g.target_amount, 0)
  const emergencyProgress = emergencyTarget > 0 ? (emergencySaved / emergencyTarget) * 100 : 0

  // D. Alokasi Rencana
  const plannedSavings = budget?.planned_savings || 0
  const plannedEmergency = budget?.planned_emergency || 0
  const totalPlannedAllocations = expenseBudget + plannedSavings + plannedEmergency
  const unallocatedPlan = targetIncome - totalPlannedAllocations
  const isPlanDeficit = unallocatedPlan < 0

  // E. Realisasi Bulanan (Arus Kas)
  const cashflowAfterExpense = actualIncome - actualExpense
  const netCashflow = actualIncome - actualExpense - netSavingsChange

  return (
    <div className="page-stack">
      {/* Greeting Header */}
      <div className="greeting-row">
        <div>
          <p className="eyebrow">PENGELOLAAN KEUANGAN PRIBADI</p>
          <h1>
            {greeting}, {name.split(' ')[0]} <span className="wave">☀</span>
          </h1>
          <p className="muted">Pantau pemasukan, belanja, dan perkembangan tabungan Kamu.</p>
        </div>
        <div className="date-chip">
          <span>{now.toLocaleDateString('id-ID', { month: 'short' })}</span>
          <strong>{now.getDate()}</strong>
        </div>
      </div>

      {/* Hero Overview Card: Realisasi Arus Kas Bulan Berjalan */}
      <section className="dashboard-hero-card">
        <div className="hero-top">
          <span>
            <Scale size={18} /> Sisa Arus Kas Bulan Berjalan
          </span>
          <span className="pill badge-pill">{monthLabel(month, year)}</span>
        </div>
        <h2 className={netCashflow < 0 ? 'destructive' : ''}>
          {netCashflow < 0 ? `- ${formatRupiah(Math.abs(netCashflow))}` : formatRupiah(netCashflow)}
        </h2>
        <div className="hero-cashflow-breakdown">
          <div>
            <small>Pemasukan</small>
            <strong className="text-emerald-300">+{formatRupiah(actualIncome)}</strong>
          </div>
          <div>
            <small>Pengeluaran</small>
            <strong>-{formatRupiah(actualExpense)}</strong>
          </div>
          <div>
            <small>Tabungan Bersih</small>
            <strong className="text-cyan-200">
              {netSavingsChange >= 0 ? '+' : '-'}
              {formatRupiah(Math.abs(netSavingsChange))}
            </strong>
          </div>
        </div>
        <div className="hero-footer-note">
          <Info size={13} />
          <span>
            Arus kas operasional: {formatRupiah(cashflowAfterExpense)} · Sisa setelah tabungan: {formatRupiah(netCashflow)}
          </span>
        </div>
      </section>

      {/* Quick Action Buttons */}
      <div className="quick-actions-row">
        <button className="button primary quick-btn" onClick={() => onAdd(false, 'expense')}>
          <ArrowUpRight size={18} />
          <span>Catat belanja</span>
        </button>
        <button className="button secondary quick-btn income" onClick={() => onAdd(false, 'income')}>
          <ArrowDownLeft size={18} />
          <span>Pemasukan</span>
        </button>
        <button
          className="button secondary camera-button"
          onClick={() => onAdd(true)}
          aria-label="Catat dari foto nota"
        >
          <Camera size={18} />
          <span>Nota</span>
        </button>
      </div>

      {/* SECTION A & B: SUMMARY CARDS (PEMASUKAN & PENGELUARAN) */}
      <div className="stats-two-col">
        {/* Pemasukan Card */}
        <section className="card compact-stat-card">
          <div className="card-mini-head">
            <span className="eyebrow text-emerald-600">PEMASUKAN</span>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <div className="compact-stat-body">
            <h3>{formatRupiah(actualIncome)}</h3>
            <div className="compact-stat-sub">
              {targetIncome > 0 ? (
                <span>
                  Target {formatRupiah(targetIncome)} ·{' '}
                  <b className={incomeDiff >= 0 ? 'text-emerald-600' : 'text-amber-600'}>
                    {incomeDiff >= 0 ? `+${formatRupiah(incomeDiff)}` : formatRupiah(incomeDiff)}
                  </b>
                </span>
              ) : (
                <span className="muted">{finance.income_count} kali pemasukan tercatat</span>
              )}
            </div>
          </div>
        </section>

        {/* Pengeluaran Card */}
        <section className="card compact-stat-card">
          <div className="card-mini-head">
            <span className="eyebrow">PENGELUARAN</span>
            <Receipt size={16} className="text-amber-600" />
          </div>
          <div className="compact-stat-body">
            <h3>{formatRupiah(actualExpense)}</h3>
            <div className="compact-stat-sub">
              {expenseBudget > 0 ? (
                <span>
                  Budget {formatRupiah(expenseBudget)} ·{' '}
                  <b className={remainingBudget < 0 ? 'destructive' : 'text-emerald-600'}>
                    {remainingBudget >= 0 ? 'Sisa ' : 'Lebih '}
                    {formatRupiah(Math.abs(remainingBudget))}
                  </b>
                </span>
              ) : (
                <span className="muted">{finance.expense_count} transaksi belanja</span>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Budget Progress Bar */}
      {expenseBudget > 0 && (
        <section className="card budget-tracker-card">
          <div className="section-heading mb-2">
            <div>
              <span className="eyebrow">MONITORING ANGGARAN</span>
              <h2>Budget Belanja Bulan Ini</h2>
            </div>
            <button
              className="text-button"
              onClick={() => onBudget(budget, month, year)}
              aria-label="Ubah budget"
            >
              <Pencil size={13} /> Ubah
            </button>
          </div>
          <div
            className={`budget-progress ${budgetProgress > 100 ? 'over' : ''}`}
            role="progressbar"
            aria-valuenow={Math.min(100, Math.round(budgetProgress))}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${Math.min(100, budgetProgress)}%` }} />
          </div>
          <div className={`budget-caption ${remainingBudget < 0 ? 'destructive' : ''} mt-2`}>
            <span>
              {remainingBudget >= 0 ? 'Sisa anggaran: ' : 'Melebihi budget: '}
              <strong>{formatRupiah(Math.abs(remainingBudget))}</strong>
            </span>
            <span>{Math.round(budgetProgress)}% terpakai</span>
          </div>
        </section>
      )}

      {/* SECTION C: TABUNGAN & DANA DARURAT */}
      <section className="card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">POS SIMPANAN</span>
            <h2>Tabungan & Dana Darurat</h2>
          </div>
          <button className="text-button" onClick={onSavings}>
            Buka Tabungan <ArrowRight size={14} />
          </button>
        </div>

        <div className="savings-dashboard-grid">
          <div className="savings-dash-box">
            <span className="muted text-xs">Total Saldo Terkumpul</span>
            <strong>{formatRupiah(allGoalsTotalSaved)}</strong>
            <small className="muted">{goals.length} pos tujuan aktif</small>
          </div>
          <div className="savings-dash-box">
            <span className="muted text-xs">Perubahan Bulan Ini</span>
            <strong className="text-cyan-700">
              {netSavingsChange >= 0 ? '+' : '-'}
              {formatRupiah(Math.abs(netSavingsChange))}
            </strong>
            <small className="muted">
              +{formatRupiah(totalSavingsDeposit)} / -{formatRupiah(totalSavingsWithdrawal)}
            </small>
          </div>
        </div>

        {emergencyGoals.length > 0 && (
          <div className="emergency-dash-banner mt-3">
            <div className="emergency-dash-info">
              <ShieldAlert size={18} className="text-amber-500" />
              <div>
                <strong>Dana Darurat: {formatRupiah(emergencySaved)}</strong>
                <small className="muted">
                  {emergencySaved >= emergencyTarget
                    ? 'Target tercapai 100%'
                    : `${Math.round(emergencyProgress)}% dari target ${formatRupiah(emergencyTarget)}`}
                </small>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* SECTION D: ALOKASI RENCANA BULANAN */}
      <section className="card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PERENCANAAN</span>
            <h2>Rencana Keuangan Bulanan</h2>
          </div>
          <button className="text-button" onClick={onPlan}>
            Kelola Rencana <ArrowRight size={14} />
          </button>
        </div>

        {budget ? (
          <div className="plan-summary-list">
            <div className="plan-mini-row">
              <span>Target pemasukan yang diharapkan</span>
              <strong>{formatRupiah(targetIncome)}</strong>
            </div>
            <div className="plan-mini-row">
              <span>Anggaran pengeluaran</span>
              <span>{formatRupiah(expenseBudget)}</span>
            </div>
            <div className="plan-mini-row">
              <span>Rencana alokasi tabungan</span>
              <span>{formatRupiah(plannedSavings)}</span>
            </div>
            <div className="plan-mini-row">
              <span>Rencana alokasi dana darurat</span>
              <span>{formatRupiah(plannedEmergency)}</span>
            </div>
            <div className={`plan-mini-row total-row ${isPlanDeficit ? 'deficit' : ''}`}>
              <span>Sisa rencana belum dialokasikan</span>
              <strong>
                {isPlanDeficit ? `- ${formatRupiah(Math.abs(unallocatedPlan))}` : formatRupiah(unallocatedPlan)}
              </strong>
            </div>
            {isPlanDeficit && (
              <p className="plan-deficit-alert mt-2">
                Rencana alokasi melebihi target pemasukan (defisit anggaran).
              </p>
            )}
          </div>
        ) : (
          <div className="budget-empty">
            <span>Belum ada rencana keuangan untuk bulan ini.</span>
            <button className="text-button" onClick={onPlan}>
              Buat rencana bulanan <ArrowRight size={14} />
            </button>
          </div>
        )}
      </section>

      {/* Pengeluaran Terbaru */}
      <section className="card">
        <div className="section-heading">
          <h2>Transaksi terbaru</h2>
          <button className="text-button" onClick={onHistory}>
            Lihat semua <ArrowRight size={15} />
          </button>
        </div>
        {recent.items.length ? (
          <TransactionList items={recent.items} onSelect={onSelect} />
        ) : (
          <EmptyState
            description="Mulai dengan mencatat transaksi pertama Kamu."
            action={
              <button className="text-button" onClick={() => onAdd()}>
                + Catat transaksi
              </button>
            }
          />
        )}
      </section>

      {/* Kategori Pengeluaran Terbesar */}
      <section className="card">
        <div className="section-heading">
          <h2>Pengeluaran terbesar</h2>
          <span className="pill">Bulan ini</span>
        </div>
        {finance.expense_categories.length ? (
          <CategoryBreakdown
            categories={finance.expense_categories}
            total={finance.expense_total}
            limit={3}
          />
        ) : (
          <p className="muted text-sm py-4">
            Ringkasan kategori akan muncul setelah Kamu mencatat pengeluaran bulan ini.
          </p>
        )}
      </section>

      <p className="daily-note">
        <Leaf size={15} /> Sedikit demi sedikit dicatat, tujuan keuangan semakin dekat.
      </p>
    </div>
  )
}
