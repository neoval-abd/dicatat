import { useState, type FormEvent } from 'react'
import { ArrowRight, BookCheck, Eye, EyeOff, ShieldCheck, Camera, ChartNoAxesColumnIncreasing, Check } from 'lucide-react'
import { db, isConfigured } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { errorMessage } from '../utils/format'

export default function Login() {
  const [register, setRegister] = useState(false), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [name, setName] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [show, setShow] = useState(false), [message, setMessage] = useState<string | null>(null)
  const toast = useToast()
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError(null); setMessage(null)
    try {
      if (register) {
        const { data, error } = await db().auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin } })
        if (error) throw error
        if (!data.session) { setMessage('Periksa email Kamu untuk konfirmasi akun, lalu masuk.'); setRegister(false); setPassword('') }
        else toast('Akun berhasil dibuat. Selamat datang!')
      } else {
        const { error } = await db().auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      }
    } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  return <div className="login-page"><header className="login-header"><a href="/" className="brand"><span className="brand-icon"><BookCheck size={24} /></span>dicatat<span className="brand-dot">.</span></a><span className="login-tag">SEDERHANA. SETIAP HARI.</span></header>
    <main className="login-main"><section className="login-intro"><span className="eyebrow"><span className="live-dot" /> RUANG UNTUK KEUANGAN Kamu</span>
      <h1>Pengeluaran kecil.<br /><span>Kendali besar.</span></h1><p>Kenali ke mana uang Kamu pergi.<br />Satu catatan, satu hari, satu langkah lebih baik.</p>
      <div className="ledger-art" aria-hidden="true"><div className="art-back" /><div className="art-note"><div className="art-note-top"><BookCheck size={22} /><span>CATATAN HARIAN</span><span className="art-check"><Check size={17} /></span></div>
        <div className="art-title">Lebih tenang, lebih terencana.</div><div className="art-lines"><span /><span /><span /></div><div className="art-bottom"><span className="art-bars"><i /><i /><i /><i /><i /></span><span>Mulai dari hari ini <ArrowRight size={14} /></span></div>
      </div><span className="art-badge"><ShieldCheck size={17} /> Ruang pribadi Kamu</span></div>
      <div className="login-features"><span><Camera size={16} /> Simpan nota</span><span><ChartNoAxesColumnIncreasing size={16} /> Pantau budget</span></div>
    </section><section className="login-card"><span className="welcome-icon">✦</span><h2>{register ? 'Mulai catatan Kamu' : 'Selamat datang kembali'}</h2><p className="muted">{register ? 'Buat akun untuk menyimpan pengeluaran Kamu.' : 'Masuk dan lanjutkan kebiasaan baik Kamu.'}</p>
      {!isConfigured ? <div className="setup-box"><h3>Satu langkah sebelum mulai</h3><p>Hubungkan aplikasi dengan proyek Supabase Kamu.</p><ol><li>Buat proyek Supabase.</li><li>Jalankan migration SQL dari folder <code>supabase/migrations</code>.</li><li>Salin <code>.env.example</code> ke <code>.env.local</code>, isi URL dan key publik.</li><li>Jalankan ulang aplikasi.</li></ol><p>Langkah lengkap tersedia di <code>README.md</code>. Data Kamu akan tersimpan di Supabase setelah setup selesai.</p></div> :
        <><form className="form-stack" onSubmit={submit}>
          {register && <div className="field"><label htmlFor="name">Nama</label><input id="name" autoComplete="name" placeholder="Nama panggilan Kamu" maxLength={100} required disabled={busy} value={name} onChange={e => setName(e.target.value)} /></div>}
          <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" placeholder="nama@email.com" required disabled={busy} value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="field"><label htmlFor="password">Kata sandi</label><div className="password-field"><input id="password" type={show ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : 1} placeholder={register ? 'Minimal 8 karakter' : 'Masukkan kata sandi'} required disabled={busy} value={password} onChange={e => setPassword(e.target.value)} /><button type="button" disabled={busy} onClick={() => setShow(!show)} className="icon-button" aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}
          <button className="button primary full" disabled={busy}>{busy ? 'Mohon tunggu…' : register ? 'Buat akun' : 'Masuk ke catatan'}{!busy && <ArrowRight size={17} />}</button>
        </form><p className="login-switch">{register ? 'Sudah punya akun?' : 'Baru di sini?'} <button className="text-button" disabled={busy} onClick={() => { setRegister(!register); setError(null); setMessage(null) }}>{register ? 'Masuk' : 'Buat akun'}</button></p></>}
      <div className="privacy-note"><ShieldCheck size={15} /><span>Catatan Kamu pribadi. Hanya Kamu yang bisa mengaksesnya.</span></div>
    </section></main><footer className="login-footer">Dibuat untuk keseharian. Bukan kerumitan.<span>Catatan Keuangan Pribadi</span></footer>
  </div>
}
