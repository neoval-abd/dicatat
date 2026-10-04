import { useEffect, useState } from 'react'
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { Category, Transaction, Filters } from '../types'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { getTransactions, PAGE_SIZE } from '../services/transactionService'
import { localDate, monthRange, weekRange } from '../utils/date'
import { TransactionList } from '../components/TransactionList'
import { EmptyState, ErrorState, Loading } from '../components/ui/States'
type Period = 'all' | 'today' | 'week' | 'month' | 'custom'
const periods: { id: Period; label: string }[] = [{ id: 'all', label: 'Semua' }, { id: 'today', label: 'Hari ini' }, { id: 'week', label: 'Minggu ini' }, { id: 'month', label: 'Bulan ini' }, { id: 'custom', label: 'Pilih tanggal' }]

export default function History({ categories, revision, onSelect }: { categories: Category[]; revision: number; onSelect: (item: Transaction) => void }) {
  const { session } = useAuth()
  const [period, setPeriod] = useState<Period>('all'), [category, setCategory] = useState(''), [search, setSearch] = useState(''), [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(0), [showFilters, setShowFilters] = useState(false)
  const now = new Date(), today = localDate(), month = monthRange(now.getMonth() + 1, now.getFullYear())
  const [start, setStart] = useState(month.start), [end, setEnd] = useState(today)
  useEffect(() => { const timer = setTimeout(() => { setDebounced(search); setPage(0) }, 300); return () => clearTimeout(timer) }, [search])
  const range: Filters = period === 'today' ? { start: today, end: today } : period === 'week' ? weekRange() : period === 'month' ? month : period === 'custom' ? { start, end } : {}
  const invalid = period === 'custom' && (!start || !end || start > end)
  const { data, loading, error, retry } = useAsync(() => invalid ? Promise.resolve({ items: [], count: 0 }) : getTransactions(session!.user.id, { ...range, category, search: debounced }, page),
    [session!.user.id, revision, page, range.start, range.end, category, debounced, invalid])
  const pages = Math.ceil((data?.count || 0) / PAGE_SIZE)
  function reset() { setPeriod('all'); setCategory(''); setSearch(''); setPage(0) }
  return <div className="page-stack"><div className="page-heading"><p className="eyebrow">SETIAP PENGELUARAN PUNYA CERITA</p><h1>Riwayat pengeluaran</h1><p className="muted">Temukan kembali catatan harian Kamu.</p></div>
    <div className="search-row"><div className="search-field"><Search size={19} /><input type="search" placeholder="Cari catatan, misalnya bensin…" aria-label="Cari catatan transaksi" maxLength={200} value={search} onChange={e => setSearch(e.target.value)} /></div><button className={`filter-toggle ${showFilters || category ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)} aria-label="Filter kategori" aria-expanded={showFilters}><SlidersHorizontal size={20} /></button></div>
    <div className="filter-chips" aria-label="Filter periode">{periods.map(p => <button className={p.id === period ? 'selected' : ''} key={p.id} aria-pressed={p.id === period} onClick={() => { setPeriod(p.id); setPage(0) }}>{p.label}</button>)}</div>
    {(showFilters || period === 'custom') && <div className="card filter-card">{period === 'custom' && <div className="form-grid"><div className="field"><label htmlFor="filter-start">Dari tanggal</label><input id="filter-start" type="date" value={start} onChange={e => { setStart(e.target.value); setPage(0) }} /></div><div className="field"><label htmlFor="filter-end">Sampai tanggal</label><input id="filter-end" type="date" value={end} onChange={e => { setEnd(e.target.value); setPage(0) }} /></div></div>}
      <div className="field"><label htmlFor="filter-category">Kategori</label><select id="filter-category" value={category} onChange={e => { setCategory(e.target.value); setPage(0) }}><option value="">Semua kategori</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <button className="text-button" onClick={reset}><X size={14} /> Reset filter</button>
    </div>}
    {invalid ? <p className="form-error" role="alert">Pilih rentang tanggal yang valid. Tanggal akhir harus setelah atau sama dengan tanggal awal.</p> : loading ? <Loading /> : error ? <ErrorState message={error} retry={retry} /> : <>
      <div className="result-heading"><span>{data?.count || 0} transaksi</span>{category && <span className="pill">{categories.find(c => c.id === category)?.name}</span>}</div>
      {data?.items.length ? <div className="card history-card"><TransactionList items={data.items} onSelect={onSelect} grouped /></div> : <div className="card"><EmptyState title="Belum ada transaksi yang cocok" description="Coba rentang tanggal, kategori, atau kata pencarian lain." /></div>}
      {pages > 1 && <div className="pagination"><button className="button secondary" disabled={page === 0} onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label="Halaman sebelumnya"><ChevronLeft size={18} /></button><span>Halaman {page + 1} dari {pages}</span><button className="button secondary" disabled={page + 1 >= pages} onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label="Halaman berikutnya"><ChevronRight size={18} /></button></div>}
    </>}
  </div>
}
