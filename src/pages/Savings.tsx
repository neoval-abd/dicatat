import { useState } from 'react'
import {
  PiggyBank,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Pencil,
  Trash2,
  Layers,
  History as HistoryIcon,
  Archive,
  Info
} from 'lucide-react'
import type { SavingsGoalWithBalance, SavingsMovement } from '../types'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { getSavingsGoals, getSavingsMovements, deleteSavingsMovement } from '../services/savingsService'
import { formatRupiah, errorMessage } from '../utils/format'
import { displayDate } from '../utils/date'
import { CategoryIcon } from '../components/CategoryIcon'
import { EmptyState, ErrorState, Loading } from '../components/ui/States'
import { SavingsGoalForm } from '../components/SavingsGoalForm'
import { SavingsMovementForm } from '../components/SavingsMovementForm'
import { Confirm } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'

export default function Savings({ revision }: { revision: number }) {
  const { session } = useAuth()
  const toast = useToast()

  const [tab, setTab] = useState<'goals' | 'history' | 'archived'>('goals')
  const [editingGoal, setEditingGoal] = useState<SavingsGoalWithBalance | null | 'new'>(null)
  const [movementModal, setMovementModal] = useState<{
    goalId?: string
    initialType?: 'deposit' | 'withdrawal'
    movement?: SavingsMovement | null
  } | null>(null)
  const [deletingMovement, setDeletingMovement] = useState<SavingsMovement | null>(null)
  const [busy, setBusy] = useState(false)

  const { data, loading, error, retry } = useAsync(async () => {
    const [activeGoals, archivedGoals, movements] = await Promise.all([
      getSavingsGoals(session!.user.id, false),
      getSavingsGoals(session!.user.id, true),
      getSavingsMovements(session!.user.id, undefined, 0, 50)
    ])
    return {
      activeGoals,
      archivedGoals: archivedGoals.filter(g => g.is_archived),
      movements: movements.items
    }
  }, [session!.user.id, revision])

  if (loading) return <Loading text="Menyiapkan data tabungan…" />
  if (error || !data) return <ErrorState message={error || 'Data tidak dapat dimuat.'} retry={retry} />

  const { activeGoals, archivedGoals, movements } = data

  // Overall totals
  const totalSaved = activeGoals.reduce((sum, g) => sum + g.current_balance, 0)
  const emergencyGoals = activeGoals.filter(g => g.goal_type === 'emergency_fund')
  const emergencySaved = emergencyGoals.reduce((sum, g) => sum + g.current_balance, 0)
  const emergencyTarget = emergencyGoals.reduce((sum, g) => sum + g.target_amount, 0)
  const emergencyProgress = emergencyTarget > 0 ? (emergencySaved / emergencyTarget) * 100 : 0

  async function removeMovement() {
    if (!session || !deletingMovement || busy) return
    setBusy(true)
    try {
      await deleteSavingsMovement(session.user.id, deletingMovement.id)
      setDeletingMovement(null)
      retry()
      toast('Catatan tabungan berhasil dihapus')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">PENGELOLAAN DANA & TABUNGAN</p>
        <h1>Tabungan & Impian</h1>
        <p className="muted">Wujudkan tujuan keuangan dengan pencatatan alokasi yang konsisten.</p>
      </div>

      {/* Overview Cards */}
      <section className="savings-hero-card">
        <div className="hero-top">
          <span>
            <PiggyBank size={18} /> Total Saldo Tabungan Terkumpul
          </span>
          <span className="pill badge-pill">{activeGoals.length} Tujuan Aktif</span>
        </div>
        <h2>{formatRupiah(totalSaved)}</h2>
        <div className="hero-subtext">
          <small>
            Perhitungan dari saldo awal dan seluruh pergerakan tabungan tercatat.
          </small>
        </div>
      </section>

      {/* Emergency Fund Highlight Card */}
      {emergencyGoals.length > 0 && (
        <section className="card emergency-fund-card">
          <div className="section-heading">
            <div className="flex-row items-center gap-2">
              <ShieldAlert size={20} className="text-amber-500" />
              <div>
                <h2>Dana Darurat</h2>
                <small className="muted">Ketahanan finansial terhadap risiko mendadak</small>
              </div>
            </div>
            <span className="pill">{Math.round(emergencyProgress)}%</span>
          </div>

          <div className="emergency-stats-row">
            <div>
              <span>Terkumpul</span>
              <strong>{formatRupiah(emergencySaved)}</strong>
            </div>
            <div className="text-right">
              <span>Target</span>
              <strong>{formatRupiah(emergencyTarget)}</strong>
            </div>
          </div>

          <div
            className="budget-progress mt-2"
            role="progressbar"
            aria-valuenow={Math.min(100, Math.round(emergencyProgress))}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${Math.min(100, emergencyProgress)}%` }} />
          </div>

          <div className="emergency-caption">
            <span>
              {emergencySaved >= emergencyTarget
                ? 'Target dana darurat telah terpenuhi!'
                : `Kurang ${formatRupiah(Math.max(emergencyTarget - emergencySaved, 0))} menuju target`}
            </span>
          </div>
        </section>
      )}

      {/* Quick Action Buttons */}
      <div className="quick-actions">
        <button
          className="button primary"
          onClick={() => setMovementModal({ initialType: 'deposit' })}
          disabled={activeGoals.length === 0}
        >
          <ArrowDownLeft size={18} /> Setor tabungan
        </button>
        <button className="button secondary" onClick={() => setEditingGoal('new')}>
          <Plus size={18} /> Tujuan baru
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="type-filter-tabs" role="tablist">
        <button
          className={`type-tab ${tab === 'goals' ? 'active' : ''}`}
          onClick={() => setTab('goals')}
        >
          <Layers size={15} /> Tujuan ({activeGoals.length})
        </button>
        <button
          className={`type-tab ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          <HistoryIcon size={15} /> Riwayat ({movements.length})
        </button>
        {archivedGoals.length > 0 && (
          <button
            className={`type-tab ${tab === 'archived' ? 'active' : ''}`}
            onClick={() => setTab('archived')}
          >
            <Archive size={15} /> Arsip ({archivedGoals.length})
          </button>
        )}
      </div>

      {/* TAB 1: ACTIVE GOALS */}
      {tab === 'goals' && (
        <div className="goals-list-stack">
          {activeGoals.length ? (
            activeGoals.map(goal => {
              const visualProgress = Math.min(100, Math.round(goal.progress))
              const isComplete = goal.current_balance >= goal.target_amount

              return (
                <div key={goal.id} className="card savings-goal-card">
                  <div className="goal-card-top">
                    <div className="goal-identity">
                      <CategoryIcon icon={goal.icon} size={22} />
                      <div>
                        <h3>{goal.name}</h3>
                        <small className="muted">
                          {goal.goal_type === 'emergency_fund'
                            ? 'Dana Darurat'
                            : goal.goal_type === 'short_term_goal'
                            ? 'Target Jangka Pendek'
                            : 'Tabungan Umum'}
                          {goal.target_date && ` · Target ${displayDate(goal.target_date)}`}
                        </small>
                      </div>
                    </div>
                    <button
                      className="icon-button"
                      onClick={() => setEditingGoal(goal)}
                      aria-label={`Edit ${goal.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                  </div>

                  <div className="goal-amounts-grid">
                    <div>
                      <span>Terkumpul</span>
                      <strong className="goal-balance-highlight">{formatRupiah(goal.current_balance)}</strong>
                    </div>
                    <div className="text-right">
                      <span>Target</span>
                      <strong>{formatRupiah(goal.target_amount)}</strong>
                    </div>
                  </div>

                  <div
                    className={`budget-progress ${isComplete ? 'complete' : ''}`}
                    role="progressbar"
                    aria-valuenow={visualProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${visualProgress}%` }} />
                  </div>

                  <div className="goal-card-footer">
                    <span>
                      {isComplete ? (
                        <b className="text-green-600">✓ Target tercapai ({Math.round(goal.progress)}%)</b>
                      ) : (
                        <>
                          Kurang <b>{formatRupiah(goal.remaining)}</b> ({Math.round(goal.progress)}%)
                        </>
                      )}
                    </span>
                    {goal.suggested_monthly > 0 && !isComplete && (
                      <span className="suggested-tag">
                        Saran: {formatRupiah(goal.suggested_monthly)} / bln
                      </span>
                    )}
                  </div>

                  {goal.notes && <p className="goal-notes-text">{goal.notes}</p>}

                  <div className="goal-quick-actions">
                    <button
                      className="button secondary text-sm"
                      onClick={() =>
                        setMovementModal({
                          goalId: goal.id,
                          initialType: 'deposit'
                        })
                      }
                    >
                      <ArrowDownLeft size={15} /> Setor
                    </button>
                    <button
                      className="button secondary text-sm"
                      onClick={() =>
                        setMovementModal({
                          goalId: goal.id,
                          initialType: 'withdrawal'
                        })
                      }
                      disabled={goal.current_balance <= 0}
                    >
                      <ArrowUpRight size={15} /> Tarik
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="card">
              <EmptyState
                title="Belum ada tujuan tabungan"
                description="Buat pos tabungan pertama Kamu, seperti Dana Darurat, Beli Gadget, atau Liburan."
                action={
                  <button className="button primary" onClick={() => setEditingGoal('new')}>
                    <Plus size={16} /> Buat tujuan tabungan
                  </button>
                }
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HISTORY (MOVEMENTS) */}
      {tab === 'history' && (
        <section className="card">
          <div className="section-heading">
            <h2>Riwayat Setoran & Penarikan</h2>
            <span className="pill">{movements.length} Catatan</span>
          </div>

          <div className="info-banner mb-3" role="note">
            <Info size={15} />
            <small>
              Pergerakan tabungan tercatat di sini secara terpisah dari pengeluaran belanja harian.
            </small>
          </div>

          {movements.length ? (
            <div className="transaction-list">
              {movements.map(mov => {
                const isDeposit = mov.movement_type === 'deposit'
                return (
                  <div key={mov.id} className="savings-movement-row">
                    <div className="movement-left">
                      <span className={`movement-icon ${isDeposit ? 'deposit' : 'withdrawal'}`}>
                        {isDeposit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </span>
                      <div>
                        <strong>{mov.goal?.name || 'Tujuan Tabungan'}</strong>
                        <small className="muted">
                          {displayDate(mov.movement_date)}
                          {mov.note && ` · ${mov.note}`}
                        </small>
                      </div>
                    </div>
                    <div className="movement-right">
                      <strong className={isDeposit ? 'text-green-600' : 'text-amber-600'}>
                        {isDeposit ? '+' : '-'}
                        {formatRupiah(mov.amount)}
                      </strong>
                      <button
                        className="icon-button destructive"
                        onClick={() => setDeletingMovement(mov)}
                        aria-label="Hapus pergerakan tabungan"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              title="Belum ada riwayat pergerakan tabungan"
              description="Catatan setoran atau penarikan yang Kamu simpan akan tampil di sini."
            />
          )}
        </section>
      )}

      {/* TAB 3: ARCHIVED GOALS */}
      {tab === 'archived' && (
        <div className="goals-list-stack">
          {archivedGoals.length ? (
            archivedGoals.map(goal => (
              <div key={goal.id} className="card savings-goal-card archived">
                <div className="goal-card-top">
                  <div className="goal-identity">
                    <CategoryIcon icon={goal.icon} size={22} />
                    <div>
                      <h3>{goal.name} (Diarsipkan)</h3>
                      <small className="muted">Saldo tersimpan: {formatRupiah(goal.current_balance)}</small>
                    </div>
                  </div>
                  <button className="text-button" onClick={() => setEditingGoal(goal)}>
                    Kelola
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="card">
              <EmptyState title="Tidak ada tujuan yang diarsipkan" description="" />
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {editingGoal && (
        <SavingsGoalForm
          goal={editingGoal === 'new' ? null : editingGoal}
          onClose={() => setEditingGoal(null)}
          onSaved={() => {
            setEditingGoal(null)
            retry()
          }}
        />
      )}

      {movementModal && (
        <SavingsMovementForm
          goals={activeGoals}
          selectedGoalId={movementModal.goalId}
          initialType={movementModal.initialType}
          movement={movementModal.movement}
          onClose={() => setMovementModal(null)}
          onSaved={() => {
            setMovementModal(null)
            retry()
          }}
        />
      )}

      {deletingMovement && (
        <Confirm
          title="Hapus pergerakan tabungan ini?"
          description={`Catatan ${
            deletingMovement.movement_type === 'deposit' ? 'setoran' : 'penarikan'
          } sebesar ${formatRupiah(deletingMovement.amount)} akan dihapus dari riwayat dan saldo tabungan.`}
          onClose={() => setDeletingMovement(null)}
          onConfirm={removeMovement}
          busy={busy}
        />
      )}
    </div>
  )
}
