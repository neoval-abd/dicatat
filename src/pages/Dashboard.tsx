import { ArrowUpRight, ArrowRight, Plus, Camera, Wallet, Pencil, Leaf } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { getSummary, getTransactions } from '../services/transactionService'
import { getBudget } from '../services/budgetService'
import { db } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatRupiah } from '../utils/format'
import { localDate, monthRange, monthLabel } from '../utils/date'
import { TransactionList } from '../components/TransactionList'
import { CategoryBreakdown } from '../components/CategoryBreakdown'
import { EmptyState, ErrorState, Loading } from '../components/ui/States'
import type { Budget, Transaction } from '../types'

export default function Dashboard({ revision, onAdd, onHistory, onSelect, onBudget }: { revision: number; onAdd: (photo?: boolean) => void; onHistory: () => void; onSelect: (item: Transaction) => void; onBudget: (budget: Budget | null) => void }) {
  const { session } = useAuth()
  const now = new Date(), month = now.getMonth() + 1, year = now.getFullYear(), today = localDate(), range = monthRange(month, year)
  const { data, loading, error, retry } = useAsync(async () => {
    const [summary, recent, budget, profile] = await Promise.all([getSummary(range.start, range.end, today), getTransactions(session!.user.id, {}, 0, 5), getBudget(session!.user.id, month, year), db().from('profiles').select('name').eq('id', session!.user.id).maybeSingle()])
    if (profile.error) throw profile.error
    return { summary, recent, budget, name: profile.data?.name || 'Kamu' }
  }, [session!.user.id, revision, today])
  if (loading) return <Loading text="Menyiapkan catatan Kamu…" />
  if (error || !data) return <ErrorState message={error || 'Data tidak dapat dimuat.'} retry={retry} />
  const { summary, recent, budget, name } = data
  const greeting = now.getHours() < 11 ? 'Selamat pagi' : now.getHours() < 15 ? 'Selamat siang' : now.getHours() < 18 ? 'Selamat sore' : 'Selamat malam'
  const remaining = budget ? budget.amount - summary.total : 0
  const progress = budget ? summary.total / budget.amount * 100 : 0
  return <div className="page-stack"><div className="greeting-row"><div><p className="eyebrow">INGAT, CATAT PENGELUARAN KAMU</p><h1>{greeting}, {name.split(' ')[0]} <span className="wave">☀</span></h1><p className="muted">Sedikit dicatat, lebih mudah dikelola.</p></div><div className="date-chip"><span>{now.toLocaleDateString('id-ID', { month: 'short' })}</span><strong>{now.getDate()}</strong></div></div>
    <section className="today-card"><div className="today-card-top"><span><span className="live-dot" /> Pengeluaran hari ini</span><span className="today-arrow"><ArrowUpRight size={22} /></span></div>
      <h2>{formatRupiah(summary.today_total)}</h2><div className="today-bottom"><span>{summary.today_count} transaksi tercatat</span><span>Hari ini, lebih terarah <Leaf size={14} /></span></div>
    </section>
    <div className="quick-actions"><button className="button primary" onClick={() => onAdd()}><Plus size={20} /> Catat pengeluaran</button><button className="button secondary camera-button" onClick={() => onAdd(true)} aria-label="Catat dari foto nota"><Camera size={20} /><span>Foto nota</span></button></div>
    <section className="card month-card"><div className="section-heading"><div><span className="eyebrow">BULAN INI</span><h2>{monthLabel(month, year)}</h2></div><span className="subtle-icon"><Wallet size={21} /></span></div>
      <div className="month-total"><span>Total pengeluaran</span><strong>{formatRupiah(summary.total)}</strong></div>
      {budget ? <><div className="budget-meta"><span>Budget <b>{formatRupiah(budget.amount)}</b></span><button className="text-button" onClick={() => onBudget(budget)} aria-label="Edit budget"><Pencil size={14} /> Ubah</button></div>
        <div className={`budget-progress ${progress > 100 ? 'over' : ''}`} role="progressbar" aria-label="Budget terpakai" aria-valuenow={Math.min(100, Math.round(progress))} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, progress)}%` }} /></div>
        <div className={`budget-caption ${remaining < 0 ? 'destructive' : ''}`}><span>{remaining >= 0 ? 'Sisa' : 'Melebihi budget'} <strong>{formatRupiah(Math.abs(remaining))}</strong></span><span>{Math.round(progress)}% terpakai</span></div>
      </> : <div className="budget-empty"><span>Belum ada budget bulan ini.</span><button className="text-button" onClick={() => onBudget(null)}>Atur budget <ArrowRight size={14} /></button></div>}
    </section>
    <section className="card"><div className="section-heading"><h2>Pengeluaran terbaru</h2><button className="text-button" onClick={onHistory}>Lihat semua <ArrowRight size={15} /></button></div>
      {recent.items.length ? <TransactionList items={recent.items} onSelect={onSelect} /> : <EmptyState description="Mulai dengan mencatat pengeluaran pertama Kamu." action={<button className="text-button" onClick={() => onAdd()}>+ Catat pengeluaran</button>} />}
    </section>
    <section className="card"><div className="section-heading"><h2>Kategori terbesar</h2><span className="pill">Bulan ini</span></div>{summary.categories.length ? <CategoryBreakdown categories={summary.categories} total={summary.total} limit={3} /> : <p className="muted text-sm py-5">Ringkasan kategori akan muncul setelah Kamu mencatat pengeluaran.</p>}</section>
    <p className="daily-note"><Leaf size={15} /> Kebiasaan baik dimulai dari satu catatan.</p>
  </div>
}
