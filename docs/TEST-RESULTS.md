# Hasil pengujian lokal

Tanggal: 3 Oktober 2026. Environment: Windows, Node.js 24.11.1, Chromium melalui Playwright. Tidak ada proyek Supabase atau credentials pengguna yang dikonfigurasi.

| Pemeriksaan | Hasil |
| --- | --- |
| Build TypeScript + Vite production | Lulus; output `dist` |
| Format Rupiah, angka integer, tanggal lokal, rentang minggu/bulan, validasi file | 5 tes lulus |
| Migration SQL di PostgreSQL PGlite dengan schema Auth/Storage minimal | 8 tes lulus |
| RLS SELECT/INSERT/UPDATE/DELETE antarakun pada empat tabel | Lulus di PostgreSQL lokal |
| FK kategori antarakun, kategori terpakai, nominal valid, unique budget | Lulus di PostgreSQL lokal |
| Ringkasan pengeluaran, jumlah, kategori, dan isolasi RPC | Lulus di PostgreSQL lokal |
| Policy folder privat Storage dan penolakan akses anon | Lulus pada schema Storage minimal lokal |
| Cascade akun di database | Lulus di PostgreSQL lokal |
| Browser pada 360/390/412/1024 px | Lulus; tidak ada overflow horizontal atau error JavaScript pada halaman setup |
| Tema mengikuti sistem di browser | Lulus pada halaman setup |
| Manifest, icon PNG, registrasi service worker | Lulus di build production |
| Kompresi foto 3200×2100 → JPEG 1600×1050, <5 MB | Lulus di browser |
| Login, email konfirmasi, CRUD, serta Storage API Supabase nyata | Belum diuji; proyek belum tersedia |
| Kamera/galeri fisik HP, install Android/iOS | Belum diuji pada perangkat nyata |
| Hosting Cloudflare Pages/Vercel | Konfigurasi disediakan; belum dipublikasikan |

Perintah: `npm test`, `npm run build`, `npx playwright test`. Total 19 tes lokal (13 unit/database + 6 browser). Screenshot halaman setup tersedia di `.verification/setup-mobile.png`, `.verification/setup-mobile-dark.png`, dan `.verification/setup-desktop.png`.

Seluruh kode layanan CRUD menggunakan Supabase SDK; tidak ada API mock atau transaksi contoh pada aplikasi. Jalankan langkah integrasi dalam `VERIFICATION.md` setelah setup Supabase. Kelulusan RLS lokal tidak membuktikan konfigurasi policy/email/storage pada proyek hosted yang belum dibuat.

## Pembaruan petunjuk pemasangan PWA · 3 Oktober 2026

Environment Supabase publik telah diisi oleh pengguna. Nama variable key disesuaikan dengan client aplikasi; form login berhasil diperiksa di localhost. Login memakai akun pengguna dan CRUD server belum menjadi bagian pengujian ini.

- Build production setelah penambahan petunjuk pemasangan: lulus.
- Playwright: 9 tes browser lulus, termasuk layout pada 360/390/412/1024 px, panduan pemasangan sebelum login, manifest/icon/service worker dan kompresi foto.
- Event `appinstalled` tidak dianggap sebagai mode standalone pada tab browser yang masih terbuka.
- Banner pemasangan hilang ketika browser memberi sinyal display-mode standalone.
- Event pemasangan dan sinyal standalone disimulasikan pada tes perilaku; instalasi OS nyata dan hilangnya kolom URL pada HP tetap perlu diuji setelah hosting HTTPS tersedia.

Panduan Android/iPhone: `PWA-INSTALL.md`. Screenshot petunjuk: `.verification/install-guide-mobile.png`.

Perubahan lanjutan sesuai permintaan pengguna: panel pemasangan di bagian atas halaman dihapus. Petunjuk kini tersedia melalui Pengaturan. Tiga tes khusus panel tersebut dihapus; hasil sembilan tes di atas merupakan hasil versi sebelum penghapusan panel.
