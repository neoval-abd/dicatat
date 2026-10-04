import { useState } from 'react'
import { Wallet, CalendarDays, ReceiptText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { getSummary } from '../services/transactionService'
import { getBudget } from '../services/budgetService'
import { monthRange, localDate, monthLabel } from '../utils/date'
import { formatRupiah } from '../utils/format'
import { CategoryBreakdown } from '../components/CategoryBreakdown'
import { EmptyState, Loading, ErrorState } from '../components/ui/States'
import type { Budget } from '../types'
export default function Statistics({ revision, onBudget }: { revision: number; onBudget: (budget: Budget | null, month: number, year: number) => void }) {
  const { session } = useAuth()
  const now = new Date()
  const [selected, setSelected] = useState(localDate().slice(0, 7))
  const [year, month] = selected.split('-').map(Number)
  const range = monthRange(month, year)
  const { data, loading, error, retry } = useAsync(async () => {
    const [summary, budget] = await Promise.all([getSummary(range.start, range.end, localDate()), getBudget(session!.user.id, month, year)])
    return { summary, budget }
  }, [session!.user.id, revision, selected])
  const days = month === now.getMonth() + 1 && year === now.getFullYear() ? now.getDate() : new Date(year, month, 0).getDate()
  const average = Math.round((data?.summary.total || 0) / days)
  return <div className="page-stack"><div className="page-heading"><p className="eyebrow">KENALI POLA, JAGA KENDALI</p><h1>Statistik pengeluaran</h1><p className="muted">Gambaran sederhana untuk keputusan lebih baik.</p></div>
    <div className="month-picker"><label htmlFor="stat-month">Periode</label><input id="stat-month" type="month" min="0001-01" max="9999-12" required value={selected} onChange={e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) setSelected(e.target.value) }} /></div>
    {loading ? <Loading /> : error || !data ? <ErrorState message={error || 'Data tidak dapat dimuat.'} retry={retry} /> : <>
      <section className="stat-total"><span><Wallet size={18} /> Pengeluaran {monthLabel(month, year)}</span><h2>{formatRupiah(data.summary.total)}</h2><p>{data.summary.count} transaksi dalam periode ini</p></section>
      <div className="stat-grid"><div className="card stat-small"><CalendarDays size={20} /><span>Rata-rata per hari</span><strong>{formatRupiah(average)}</strong><small>{days} hari {month === now.getMonth() + 1 && year === now.getFullYear() ? 'berjalan' : 'dalam bulan'}</small></div><div className="card stat-small"><ReceiptText size={20} /><span>Jumlah transaksi</span><strong>{data.summary.count}</strong><small>pengeluaran tercatat</small></div></div>
      <section className="card"><div className="section-heading"><h2>Pengeluaran per kategori</h2></div>{data.summary.categories.length ? <CategoryBreakdown categories={data.summary.categories} total={data.summary.total} /> : <EmptyState title="Belum ada statistik" description="Catat pengeluaran untuk melihat distribusi kategori Anda." />}</section>
      <section className="card stat-budget"><div><Wallet size={22} /><h3>{data.budget ? 'Budget bulan ini' : 'Beri pengeluaran Anda batas'}</h3><p className="muted">{data.budget ? `${formatRupiah(data.budget.amount)} · ${Math.round(data.summary.total / data.budget.amount * 100)}% terpakai` : 'Atur budget sederhana untuk bulan yang dipilih.'}</p></div><button className="button secondary" onClick={() => onBudget(data.budget, month, year)}>{data.budget ? 'Ubah budget' : 'Atur budget'}</button></section>
    </>}
  </div>
}
