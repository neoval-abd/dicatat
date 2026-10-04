import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Camera, ImagePlus, Trash2, LoaderCircle } from 'lucide-react'
import type { Category, Transaction } from '../types'
import { useAuth } from '../context/AuthContext'
import { useToast } from './ui/Toast'
import { Modal } from './ui/Modal'
import { MoneyInput } from './ui/MoneyInput'
import { ReceiptImage } from './ReceiptImage'
import { localDate, localTime } from '../utils/date'
import { errorMessage, formatAmountInput, parseAmount } from '../utils/format'
import { validateImage } from '../utils/image'
import { uploadReceipt, cleanReceipt } from '../services/storageService'
import { saveTransaction } from '../services/transactionService'
import { useOnline } from '../hooks/useOnline'

export function TransactionForm({ categories, transaction, photoFirst = false, onClose, onSaved }: {
  categories: Category[]; transaction?: Transaction; photoFirst?: boolean; onClose: () => void; onSaved: () => void
}) {
  const { session } = useAuth()
  const toast = useToast(), online = useOnline()
  const [amount, setAmount] = useState(formatAmountInput(transaction ? String(transaction.amount) : ''))
  const [category, setCategory] = useState(transaction?.category_id || '')
  const [date, setDate] = useState(transaction?.transaction_date || localDate())
  const [time, setTime] = useState(transaction?.transaction_time.slice(0, 5) || localTime())
  const [note, setNote] = useState(transaction?.note || '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Menyimpan…')
  const [error, setError] = useState<string | null>(null)
  const camera = useRef<HTMLInputElement>(null), gallery = useRef<HTMLInputElement>(null), lock = useRef(false)
  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file); setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  function pickFile(value?: File) {
    if (!value) return
    try { validateImage(value); setFile(value); setRemovePhoto(false); setError(null) } catch (error) { toast(errorMessage(error), 'error') }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (lock.current || !session) return
    setError(null)
    let parsed: number
    try {
      parsed = parseAmount(amount)
      if (!category || !date || !time) throw new Error('Kategori, tanggal, dan waktu wajib diisi.')
      if (!online) throw new Error('Koneksi bermasalah. Hubungkan internet untuk menyimpan.')
    } catch (error) { setError(errorMessage(error)); return }
    lock.current = true; setBusy(true)
    const userId = session.user.id
    let newPath: string | null = null
    try {
      if (file) { setStatus('Mengompresi & mengupload nota…'); newPath = await uploadReceipt(userId, date, file) }
      setStatus('Menyimpan transaksi…')
      const path = newPath || (removePhoto ? null : transaction?.receipt_path || null)
      await saveTransaction(userId, { amount: parsed, category_id: category, transaction_date: date,
        transaction_time: time, note: note.trim() || null, receipt_path: path }, transaction?.id)
      let cleaned = true
      if (transaction?.receipt_path && transaction.receipt_path !== path) cleaned = await cleanReceipt(userId, transaction.receipt_path)
      onSaved()
      toast(cleaned ? `Transaksi berhasil ${transaction ? 'diubah' : 'disimpan'}` : 'Transaksi tersimpan. Foto lama belum terhapus; ulangi pembersihan di Pengaturan.', cleaned ? 'success' : 'error')
    } catch (error) {
      const cleaned = newPath ? await cleanReceipt(userId, newPath) : true
      setError(errorMessage(error) + (cleaned ? '' : ' Foto yang belum terpakai menunggu pembersihan di Pengaturan.'))
    } finally { lock.current = false; setBusy(false) }
  }
  const photoSection = <div className="field"><span className="field-label">Foto nota <small>opsional</small></span>
    {preview ? <img src={preview} alt="Preview foto nota yang dipilih" className="photo-preview" /> : transaction?.receipt_path && !removePhoto ? <ReceiptImage path={transaction.receipt_path} /> :
      <div className="photo-empty"><Camera size={28} /><span>Simpan bukti pengeluaran Kamu</span><small>JPG, PNG, WebP · maksimal 15 MB</small></div>}
    <div className="photo-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => camera.current?.click()}><Camera size={17} /> Kamera</button>
      <button type="button" className="button secondary" disabled={busy} onClick={() => gallery.current?.click()}><ImagePlus size={17} /> Galeri</button>
      {(file || (transaction?.receipt_path && !removePhoto)) && <button type="button" className="icon-button destructive" disabled={busy} onClick={() => { setFile(null); setRemovePhoto(true) }} aria-label="Hapus foto nota"><Trash2 size={19} /></button>}
    </div>
    <input ref={camera} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={e => { pickFile(e.target.files?.[0]); e.target.value = '' }} aria-label="Ambil foto dengan kamera" />
    <input ref={gallery} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { pickFile(e.target.files?.[0]); e.target.value = '' }} aria-label="Pilih foto dari galeri" />
  </div>
  return <Modal title={transaction ? 'Edit pengeluaran' : 'Catat pengeluaran'} onClose={onClose} busy={busy}>
    <form onSubmit={submit} className="form-stack">
      <p className="muted text-sm">Catatan kecil, keuangan lebih terarah.</p>
      {photoFirst && photoSection}
      <div className="field"><label htmlFor="amount">Nominal pengeluaran</label><MoneyInput value={amount} onChange={setAmount} disabled={busy} large /></div>
      <div className="field"><label htmlFor="category">Kategori</label><select id="category" required disabled={busy} value={category} onChange={e => setCategory(e.target.value)}>
        <option value="" disabled>Pilih kategori</option>{categories.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}
      </select>{!categories.length && <p className="field-error">Tambahkan kategori di Pengaturan terlebih dahulu.</p>}</div>
      <div className="form-grid"><div className="field"><label htmlFor="date">Tanggal</label><input id="date" type="date" min="0001-01-01" max="9999-12-31" required value={date} disabled={busy} onChange={e => setDate(e.target.value)} /></div>
        <div className="field"><label htmlFor="time">Waktu</label><input id="time" type="time" required value={time} disabled={busy} onChange={e => setTime(e.target.value)} /></div></div>
      <div className="field"><label htmlFor="note">Catatan <small>opsional</small></label><textarea id="note" rows={2} maxLength={2000} placeholder="Untuk apa pengeluaran ini?" value={note} disabled={busy} onChange={e => setNote(e.target.value)} /></div>
      {!photoFirst && photoSection}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary full" disabled={busy || !online || !categories.length}>{busy && <LoaderCircle className="spin" size={18} />}{busy ? status : transaction ? 'Simpan perubahan' : 'Simpan pengeluaran'}</button>
      {!online && <p className="field-error">Internet diperlukan untuk menyimpan transaksi.</p>}
    </form>
  </Modal>
}
