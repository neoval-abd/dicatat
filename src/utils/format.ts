const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
export function formatRupiah(value: number) { return rupiah.format(value).replace(/\s/g, '') }
export function safeAmount(value: number | string) {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 0) throw new Error('Nominal melampaui batas angka yang didukung.')
  return number
}
export function parseAmount(value: string) {
  const amount = safeAmount(value.replace(/\D/g, ''))
  if (amount <= 0) throw new Error('Nominal harus lebih dari Rp0.')
  return amount
}
export function formatAmountInput(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
export function errorMessage(error: unknown): string {
  const e = error as { code?: string; message?: string }
  if (e?.code === '23503') return 'Kategori ini masih digunakan oleh transaksi. Ubah kategori transaksi terlebih dahulu.'
  if (e?.code === '23505') return 'Nama kategori sudah digunakan.'
  if (e?.code === '42501') return 'Akses ditolak. Silakan masuk kembali.'
  if (e?.code === 'PGRST116') return 'Data sudah berubah atau tidak tersedia. Muat ulang lalu coba lagi.'
  const message = e?.message || ''
  if (/Invalid login credentials/i.test(message)) return 'Email atau kata sandi salah.'
  if (/Email not confirmed/i.test(message)) return 'Konfirmasi email Anda terlebih dahulu.'
  if (/already registered/i.test(message)) return 'Email ini sudah terdaftar.'
  if (/fetch|network|Failed to fetch/i.test(message)) return 'Koneksi bermasalah. Periksa internet lalu coba lagi.'
  if (/rate limit/i.test(message)) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
  if (/password.*(least|short|weak)|weak.*password/i.test(message)) return 'Kata sandi belum memenuhi ketentuan. Gunakan kata sandi yang lebih panjang dan kuat.'
  if (/signups.*disabled/i.test(message)) return 'Pendaftaran akun baru belum diaktifkan.'
  if (/unable to validate email|invalid.*email/i.test(message)) return 'Alamat email tidak valid.'
  if (/schema cache|does not exist|not find the function/i.test(message)) return 'Database belum siap. Jalankan migration SQL Supabase dari panduan setup.'
  return /^(Supabase|Nominal|Kategori|Nama|Budget|Gunakan|Foto|File|Gagal|Browser|Isi|Akses|Koneksi|Database|Terjadi|Tanggal)/.test(message)
    ? message : 'Permintaan gagal. Periksa koneksi dan konfigurasi Supabase, lalu coba lagi.'
}
