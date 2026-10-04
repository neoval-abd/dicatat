import { useState } from 'react'
import { Smartphone, CheckCircle2 } from 'lucide-react'
import type { useInstall } from '../hooks/useInstall'
import { Modal } from './ui/Modal'
import { useToast } from './ui/Toast'
import { errorMessage } from '../utils/format'

export function InstallCard({ install }: { install: ReturnType<typeof useInstall> }) {
  const [guide, setGuide] = useState(false)
  const toast = useToast()
  const title = install.standalone ? 'Mode aplikasi aktif' : install.installed ? 'Buka dari layar utama' : 'Buka seperti aplikasi'
  const description = install.standalone ? 'Dicatat sudah dibuka tanpa kolom URL browser.'
    : install.installed ? 'Pemasangan selesai. Buka ikon Keuangan di Home Screen.'
    : 'Pasang di Home Screen untuk tampilan tanpa kolom URL.'
  return <>
    <section className="card install-card" aria-label="Pemasangan aplikasi">
      <span className="install-icon">{install.standalone ? <CheckCircle2 size={23} /> : <Smartphone size={23} />}</span>
      <div className="install-copy"><h2>{title}</h2><p className="muted text-sm">{description}</p></div>
      {!install.standalone && <div className="install-buttons">
        {install.available && <button className="button primary" disabled={install.installing} onClick={() => install.install().catch(error => toast(errorMessage(error), 'error'))}>{install.installing ? 'Memasang…' : 'Pasang aplikasi'}</button>}
        <button className="button secondary" disabled={install.installing} onClick={() => setGuide(true)}>{install.installed ? 'Cara buka' : 'Cara pasang'}</button>
      </div>}
    </section>
    {guide && <Modal title="Buka Dicatat tanpa kolom URL" onClose={() => setGuide(false)}>
      <div className="install-guide">
        <p className="muted">Setelah dipasang, buka Dicatat dari ikon <strong>Keuangan</strong> di layar utama HP.</p>
        {!install.secure && <p className="form-error">Alamat demo ini belum mendukung pemasangan PWA. Buka Dicatat melalui alamat HTTPS dari hosting terlebih dahulu.</p>}
        <div><h3>Android · Chrome</h3><ol><li>Buka alamat aplikasi di Chrome.</li><li>Tekan menu <strong>⋮</strong>, lalu pilih <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke layar utama</strong>. Jika ada pilihan, pilih <strong>Instal</strong>.</li><li>Selesaikan pemasangan, lalu buka ikon <strong>Keuangan</strong> di layar utama.</li></ol></div>
        <div><h3>iPhone · Safari</h3><ol><li>Buka alamat aplikasi di Safari.</li><li>Tekan <strong>Bagikan</strong>, lalu <strong>Tambahkan ke Layar Utama</strong>.</li><li>Jika tersedia, aktifkan <strong>Buka sebagai App / Open as Web App</strong>, lalu tekan <strong>Tambah</strong>.</li><li>Buka ikon aplikasi dari layar utama.</li></ol></div>
        <p className="hint">Saat alamat dibuka di tab browser biasa, kolom URL tetap muncul. Pemasangan tidak menutup tab tersebut secara otomatis.</p>
        <button className="button primary full" onClick={() => setGuide(false)}>Mengerti</button>
      </div>
    </Modal>}
  </>
}
