import { useState, type FormEvent } from 'react'
import { Sun, Moon, Heart, Plus, Pencil, Trash2, LogOut, ShieldCheck, BookCheck, LoaderCircle, RefreshCw } from 'lucide-react'
import type { Category } from '../types'
import { db } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme, type Theme } from '../context/ThemeContext'
import { useToast } from '../components/ui/Toast'
import { Modal, Confirm } from '../components/ui/Modal'
import { CategoryIcon, categoryIcons, categoryIconLabels } from '../components/CategoryIcon'
import { saveCategory, deleteCategory } from '../services/categoryService'
import { pendingReceipts, retryReceiptCleanup } from '../services/storageService'
import { useAsync } from '../hooks/useAsync'
import { errorMessage } from '../utils/format'
import { ErrorState, Loading } from '../components/ui/States'
import { InstallCard } from '../components/InstallCard'
import type { useInstall } from '../hooks/useInstall'

export default function Settings({ categories, onChanged, install }: { categories: Category[]; onChanged: () => void; install: ReturnType<typeof useInstall> }) {
  const { session } = useAuth(), { theme, setTheme } = useTheme(), toast = useToast()
  const [editing, setEditing] = useState<Category | 'new' | null>(null), [deleting, setDeleting] = useState<Category | null>(null)
  const [busy, setBusy] = useState(false), [signout, setSignout] = useState(false), [cleanup, setCleanup] = useState(pendingReceipts(session!.user.id).length)
  const [name, setName] = useState(''), [savingName, setSavingName] = useState(false)
  const profile = useAsync(async () => {
    const { data, error } = await db().from('profiles').select('name').eq('id', session!.user.id).maybeSingle()
    if (error) throw error
    setName(data?.name || '')
    return data
  }, [session!.user.id])
  async function updateName(event: FormEvent) {
    event.preventDefault(); if (savingName) return; setSavingName(true)
    try { const { error } = await db().from('profiles').upsert({ id: session!.user.id, name: name.trim() }).select().single(); if (error) throw error; toast('Nama berhasil disimpan'); onChanged() }
    catch (error) { toast(errorMessage(error), 'error') } finally { setSavingName(false) }
  }
  async function removeCategory() {
    if (!deleting || busy) return; setBusy(true)
    try { await deleteCategory(session!.user.id, deleting.id); setDeleting(null); onChanged(); toast('Kategori berhasil dihapus') }
    catch (error) { toast(errorMessage(error), 'error') } finally { setBusy(false) }
  }
  async function cleanupFiles() {
    if (busy) return; setBusy(true)
    try { const remaining = await retryReceiptCleanup(session!.user.id); setCleanup(remaining); toast(remaining ? `${remaining} foto belum dapat dihapus. Periksa koneksi lalu coba lagi.` : 'Semua foto yang tidak terpakai berhasil dibersihkan', remaining ? 'error' : 'success') }
    catch (error) { toast(errorMessage(error), 'error') } finally { setBusy(false) }
  }
  async function logout() {
    if (busy) return; setBusy(true)
    try { const { error } = await db().auth.signOut({ scope: 'local' }); if (error) throw error }
    catch (error) { toast(errorMessage(error), 'error'); setBusy(false) }
  }
  const themes: { value: Theme; label: string; Icon: typeof Sun }[] = [{ value: 'light', label: 'Terang', Icon: Sun }, { value: 'dark', label: 'Gelap', Icon: Moon }, { value: 'pink', label: 'Pink', Icon: Heart }]
  return <div className="page-stack"><div className="page-heading"><p className="eyebrow">SESUAIKAN RUANG ANDA</p><h1>Pengaturan</h1><p className="muted">Sedikit personal, lebih nyaman digunakan.</p></div>
    <section className="card"><div className="profile-heading"><span className="avatar">{(name || session!.user.email || 'A').charAt(0).toUpperCase()}</span><div><h2>Akun pribadi</h2><p className="muted break-all text-sm">{session!.user.email}</p></div></div>
      {profile.loading ? <Loading /> : profile.error ? <ErrorState message={profile.error} retry={profile.retry} /> : <form className="profile-form" onSubmit={updateName}><div className="field"><label htmlFor="profile-name">Nama panggilan</label><input id="profile-name" maxLength={100} value={name} disabled={savingName} placeholder="Nama Anda" onChange={e => setName(e.target.value)} /></div><button className="button secondary" disabled={savingName}>{savingName ? 'Menyimpan…' : 'Simpan'}</button></form>}
    </section>
    <section className="card"><div className="section-heading"><h2>Tampilan</h2></div><p className="muted text-sm mb-4">Pilih suasana yang paling nyaman.</p><div className="theme-options">{themes.map(({ value, label, Icon }) => <button key={value} aria-pressed={theme === value} className={theme === value ? 'selected' : ''} onClick={() => setTheme(value)}><Icon size={22} /><span>{label}</span></button>)}</div></section>
    <section className="card"><div className="section-heading"><h2>Kategori pengeluaran</h2><button className="text-button" onClick={() => setEditing('new')}><Plus size={16} /> Tambah</button></div>
      <div className="settings-categories">{categories.map(category => <div className="settings-category" key={category.id}><CategoryIcon icon={category.icon} size={19} /><span>{category.name}</span><button className="icon-button" aria-label={`Edit kategori ${category.name}`} onClick={() => setEditing(category)}><Pencil size={16} /></button><button className="icon-button destructive" aria-label={`Hapus kategori ${category.name}`} onClick={() => setDeleting(category)}><Trash2 size={16} /></button></div>)}</div>
      {!categories.length && <p className="muted text-sm py-4">Belum ada kategori. Tambahkan kategori pertama Kamu.</p>}
      <p className="hint mt-3">Kategori yang digunakan transaksi tidak dapat dihapus.</p>
    </section>
    <InstallCard install={install} />
    <section className="card cleanup-card"><div><h2>Pembersihan foto nota</h2><p className="muted text-sm">{cleanup ? `${cleanup} foto tidak terpakai menunggu penghapusan.` : 'Tidak ada penghapusan foto yang tertunda.'}</p></div><button className="button secondary" disabled={busy} onClick={cleanupFiles}>{busy ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />} Cek ulang</button></section>
    <button className="button logout-button full" onClick={() => setSignout(true)}><LogOut size={18} /> Keluar dari akun</button>
    <div className="settings-footer"><BookCheck size={24} /><strong>dicatat.</strong><span>Catatan Keuangan · v1.0.0</span><p><ShieldCheck size={14} /> Data pribadi, tersimpan di akun Anda.</p></div>
    {editing && <CategoryForm category={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged() }} />}
    {deleting && <Confirm title="Hapus kategori?" description={`Kategori “${deleting.name}” akan dihapus jika tidak digunakan oleh transaksi.`} busy={busy} onClose={() => setDeleting(null)} onConfirm={removeCategory} />}
    {signout && <Modal title="Keluar dari akun?" onClose={() => setSignout(false)} busy={busy}><p className="muted mb-6">Catatan Anda tetap tersimpan dan dapat dibuka kembali setelah masuk.</p><div className="button-row"><button className="button secondary" disabled={busy} onClick={() => setSignout(false)}>Batal</button><button className="button primary" disabled={busy} onClick={logout}>{busy ? 'Keluar…' : 'Keluar'}</button></div></Modal>}
  </div>
}

function CategoryForm({ category, onClose, onSaved }: { category?: Category; onClose: () => void; onSaved: () => void }) {
  const { session } = useAuth(), toast = useToast()
  const [name, setName] = useState(category?.name || ''), [icon, setIcon] = useState(category?.icon || 'Shapes')
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(null)
    try { await saveCategory(session!.user.id, name, icon, category?.id); onSaved(); toast(`Kategori berhasil ${category ? 'diubah' : 'ditambahkan'}`) }
    catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  return <Modal title={category ? 'Edit kategori' : 'Tambah kategori'} onClose={onClose} busy={busy}><form className="form-stack" onSubmit={submit}><div className="field"><label htmlFor="category-name">Nama kategori</label><input id="category-name" required maxLength={60} value={name} placeholder="Misalnya, Perawatan Diri" disabled={busy} onChange={e => setName(e.target.value)} /></div>
    <div className="field"><span className="field-label">Ikon kategori</span><div className="icon-picker">{Object.keys(categoryIcons).map(key => <button key={key} type="button" className={key === icon ? 'selected' : ''} aria-label={`Ikon ${categoryIconLabels[key]}`} aria-pressed={key === icon} disabled={busy} onClick={() => setIcon(key)}><CategoryIcon icon={key} /></button>)}</div></div>
    {error && <p className="form-error" role="alert">{error}</p>}<button className="button primary full" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan kategori'}</button></form></Modal>
}
