# Dicatat · Catatan Keuangan

PWA pencatatan pengeluaran pribadi dalam bahasa Indonesia. React + Vite + TypeScript + Tailwind CSS; Supabase Auth, PostgreSQL, dan Storage. Tidak ada API mock, transaksi contoh, APK, OCR, atau sinkronisasi offline.

## 1. Arsitektur

Browser → React → service Supabase → Auth / PostgreSQL dengan RLS / bucket privat `receipts`.
Session ditangani Supabase; komponen terlindungi hanya dirender setelah login. RLS tetap membatasi akses langsung API. Angka uang berupa integer Rupiah, tidak menggunakan float. Ringkasan dihitung oleh fungsi SQL di server, bukan mengambil seluruh transaksi. Riwayat menggunakan pagination 20 baris.

## 2. Struktur

```
src/
  components/        # navigasi, form, detail, daftar transaksi
    ui/              # dialog, toast, loading, empty state
  context/           # autentikasi dan preferensi tema
  hooks/             # pemuatan data, status jaringan
  lib/               # client Supabase
  pages/             # Login, Dashboard, Riwayat, Statistik, Pengaturan
  services/          # query transaksi, kategori, budget, nota
  types/             # model data
  utils/             # Rupiah, tanggal, validasi, kompresi
supabase/
  migrations/        # schema, trigger, RLS, Storage, fungsi agregasi
  tests/             # pemeriksaan RLS di database
scripts/             # verifikasi keamanan dua akun
```

## 3–6. Schema, SQL, RLS, dan Storage

Jalankan `supabase/migrations/202610030001_initial.sql` di SQL Editor proyek Supabase baru, satu kali. Migration membuat:

| Tabel | Data utama |
| --- | --- |
| profiles | id → auth.users, name, created_at |
| categories | id, user_id, name, icon, created_at |
| transactions | id, user_id, category_id, amount BIGINT, transaction_date, transaction_time, note, receipt_path, created_at, updated_at |
| monthly_budgets | id, user_id, month, year, amount BIGINT, timestamps; UNIQUE(user_id, month, year) |

Setiap tabel memiliki RLS SELECT/INSERT/UPDATE/DELETE berdasarkan `auth.uid()`. Foreign key gabungan `(category_id, user_id)` mencegah pemakaian kategori akun lain. Kategori yang dipakai transaksi tidak boleh dihapus. Trigger pendaftaran membuat profil dan sembilan kategori awal. RPC `expense_summary` berjalan dengan SECURITY INVOKER sehingga mengikuti RLS.

Bucket `receipts` privat, maksimal 5 MB sesudah kompresi, hanya JPEG/PNG/WebP. Path object adalah `{user_id}/{year}/{month}/{uuid}.jpg`; lengkapnya `receipts/{user_id}/...`. Policy Storage membatasi folder pertama ke UID pengguna. Preview memakai signed URL 5 menit, tidak menyimpan URL publik atau Base64 di database. File baru dibersihkan jika penyimpanan transaksi gagal. Penghapusan file lama dilakukan setelah perubahan data berhasil; kegagalan cleanup ditampilkan dan dapat diulang, karena Storage dan PostgreSQL bukan satu transaksi atomik.

## 7–8. Dependency dan environment

Runtime: React, React DOM, `@supabase/supabase-js`, `lucide-react`. Build: Vite, TypeScript, Tailwind CSS + plugin Vite, `vite-plugin-pwa`. Pengujian: Vitest, PGlite (PostgreSQL lokal khusus tes), dan Playwright. Grafik memakai CSS tanpa dependency chart tambahan. Dependency pengujian tidak ikut bundle frontend.

Salin `.env.example` ke `.env.local` dan isi:

```dotenv
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

Ambil dari Project Settings → API. **Jangan masukkan service_role / secret key.** Kedua variable VITE bersifat publik dan dibundel dalam frontend. Jika belum dikonfigurasi, aplikasi menampilkan petunjuk setup, tanpa data palsu.

Di Supabase Authentication → URL Configuration, isi Site URL dengan URL production dan tambahkan redirect URL development `http://localhost:5173` serta URL production. Aktifkan Email/Password. Pendaftaran disediakan dengan konfirmasi email; untuk penggunaan pribadi, setelah akun dibuat Anda dapat mematikan pendaftaran baru. SMTP dan batas pengiriman email mengikuti konfigurasi Supabase Anda.

## 9. Implementasi React

Login/daftar → dashboard, tambah manual atau kamera/galeri, edit/detail/hapus, pencarian dan rentang tanggal/kategori, statistik bulanan, budget per bulan, kategori CRUD, tema terang/gelap/sistem. Semua persistence langsung ke Supabase. Kamera dan galeri memiliki input terpisah. JPEG/PNG/WebP maksimal 15 MB sebelum kompresi; gambar diperkecil hingga 1600 px dan JPEG kualitas 0,8. Waktu/tanggal menggunakan waktu lokal perangkat. Format uang `Intl.NumberFormat('id-ID')` dan aman hingga `Number.MAX_SAFE_INTEGER`.

## 10. PWA

`vite.config.ts` menghasilkan `manifest.json`, service worker, icon 192/512 dan maskable. Tampilan standalone mendukung Home Screen; iOS memakai Share → Add to Home Screen. Cache hanya app shell/aset statis; request Auth, database, serta foto tidak di-cache. Internet diperlukan untuk data. Pembaruan aplikasi ditawarkan melalui tombol agar form tidak terhapus saat update. Install membutuhkan HTTPS (localhost dikecualikan) dan dukungan browser.

Petunjuk pemasangan tersedia di Pengaturan. Tombol pemasangan muncul saat browser menawarkan install. Setelah pemasangan, buka ikon **Keuangan** di Home Screen agar kolom URL tidak terlihat. Detail langkah Android/iPhone dan batasan demo HTTP: [PWA-INSTALL.md](docs/PWA-INSTALL.md).

## 11. Jalankan lokal

Node.js 22.12+ atau 24 direkomendasikan.

```sh
npm install
cp .env.example .env.local
npm run dev
```

PowerShell: gunakan `npm.cmd` jika `npm.ps1` diblokir execution policy; salin dengan `Copy-Item .env.example .env.local`. Buka `http://localhost:5173`. Untuk kamera HP dan install PWA gunakan HTTPS; alamat HTTP LAN biasanya tidak memenuhi syarat install.

## 12. Build dan pengujian

```sh
npm test
npm run build
npm run preview
```

Output production: `dist/`. Uji install pada build production. Checklist dan cara pengujian integrasi ada di `docs/VERIFICATION.md`.

## 13. Deployment

**Cloudflare Pages:** import repository, framework Vite, build `npm run build`, output `dist`, Node 22+. Tambahkan kedua environment variable di pengaturan build lalu deploy. Alternatif upload folder `dist` melalui Direct Upload setelah build lokal. Pages menangani SPA otomatis karena tidak ada `404.html`; `_headers` memberi header dasar.

**Cloudflare Workers (Static Assets):** untuk proyek Workers seperti `dicatat`, gunakan build `npm run build` dan deploy `npx wrangler deploy`. `wrangler.jsonc` menunjuk folder `dist` dan mengaktifkan fallback SPA. Jangan tambahkan aturan `/* /index.html 200` pada `_redirects`, karena Workers menolaknya sebagai loop. Isi kedua variable `VITE_SUPABASE_*` pada pengaturan build Workers, lalu deploy ulang setiap kali nilainya berubah.

**Vercel:** import repository, preset Vite, set kedua environment variable, deploy. `vercel.json` sudah disediakan. Perubahan environment membutuhkan build ulang. Tambahkan domain hosting ke Supabase URL Configuration. Jangan upload `.env.local` ke repository.

Frontend statis dapat memakai paket gratis kedua layanan; database/storage/email mengikuti kuota paket Supabase. Tidak ada langganan atau layanan OCR tambahan. Hosting publik belum dilakukan oleh source code ini.

Referensi resmi: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage policies](https://supabase.com/docs/guides/storage/security/access-control), [Vite PWA](https://vite-pwa-org.netlify.app/guide/), [Tailwind Vite](https://tailwindcss.com/docs/installation/using-vite), [Cloudflare Vite](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/), [Vercel Vite](https://vercel.com/docs/frameworks/frontend/vite).
