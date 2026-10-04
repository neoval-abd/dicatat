# Verifikasi

## Pemeriksaan otomatis lokal

`npm test` menguji format/validasi uang, batas integer, tanggal lokal, leap year, rentang minggu, dan validasi foto. Pengujian migration menjalankan PostgreSQL melalui PGlite dengan schema Auth/Storage minimal: syntax SQL, trigger kategori awal, RLS lintas user, foreign key kategori, kebijakan folder Storage, serta jumlah agregasi. Schema Auth/Storage minimal bukan pengganti pengujian Supabase yang sesungguhnya.

`npm run build` memeriksa TypeScript, menghasilkan bundle, manifest.json, dan service worker. `npx playwright test` memeriksa halaman masuk/setup pada lebar 360, 390, 412 dan 1024, error browser, manifest, pengiriman aset, dan kompresi gambar. Tes menerima konfigurasi kosong maupun environment Supabase publik yang sudah diisi. Panduan pemasangan kini hanya tersedia di Pengaturan; tes panel pemasangan sebelum login sudah dihapus. Pemasangan fisik pada HP tetap perlu diuji terpisah. Playwright membutuhkan browser Chromium (`npx playwright install chromium`).

## Setup untuk pengujian Supabase nyata

1. Buat proyek, jalankan migration, isi `.env.local`.
2. Aktifkan Email/Password. Buat dua akun uji A dan B; konfirmasi email keduanya.
3. Jalankan aplikasi dan login A. Pastikan sembilan kategori muncul.
4. Tambah pengeluaran Rp45.000 dengan tanggal hari ini, kategori Makan & Minum, catatan, dan foto nota dari kamera/galeri. Periksa preview, transaksi dan storage path.
5. Pastikan total hari ini/bulan ini Rp45.000. Tambahkan budget Rp100.000: sisa Rp55.000, progress 45%. Statistik rata-rata = total bulan / jumlah hari yang telah berjalan.
6. Edit nominal menjadi Rp50.000, ganti foto dan kategori. Pastikan file lama terhapus dan total menjadi Rp50.000.
7. Perbesar foto dari detail. Hapus foto melalui edit, simpan, lalu pastikan path kosong dan object terhapus.
8. Coba filter hari, minggu (Senin–Minggu), bulan, custom range, kategori dan pencarian catatan. Tambahkan >20 transaksi uji untuk pagination.
9. Tambah/edit kategori. Menghapus kategori terpakai harus ditolak. Hapus kategori kosong harus berhasil.
10. Login B: data A tidak terlihat. Uji akses API langsung memakai script di bawah untuk menghindari kesimpulan dari UI saja.
11. Hapus transaksi dengan nota; pastikan baris database dan object hilang. Putuskan jaringan untuk memeriksa pesan gagal; retry pembersihan tersedia di Pengaturan.
12. Logout, refresh, pastikan kembali ke login. Uji nama profil dan preferensi terang/gelap/sistem.
13. Build production, deploy HTTPS atau buka localhost. Pastikan manifest/icons/service worker tersedia, install di Android dan Add to Home Screen di Safari iOS. Uji standalone, safe area, keyboard, kamera/galeri pada perangkat nyata.

## Script keamanan dan lifecycle

Script ini **membuat lalu menghapus data uji** pada akun A/B yang Anda tentukan. Gunakan akun khusus pengujian. Script tidak membutuhkan service_role key, tidak menampilkan kata sandi/token, dan tidak mengubah data lain.

Isi environment terminal (bukan variable VITE):

```
SUPABASE_URL
SUPABASE_ANON_KEY
TEST_USER_A_EMAIL
TEST_USER_A_PASSWORD
TEST_USER_B_EMAIL
TEST_USER_B_PASSWORD
```

Jalankan `npm run test:security`. Script memeriksa login, isolasi SELECT/INSERT/UPDATE/DELETE seluruh tabel, referensi kategori lintas user, agregasi dashboard, CRUD kategori/budget/transaksi, upload/signed URL/delete Storage. Credentials hanya berada di environment proses.

## Batasan verifikasi

Tanpa URL/key/proyek Supabase, pengujian login, email, akses API nyata, upload nota ke server, dan deployment belum dapat dijalankan. Browser desktop tidak dapat memastikan perilaku kamera serta instalasi di setiap HP. Status lokal yang telah dijalankan dicatat dalam `docs/TEST-RESULTS.md`; jangan menganggap checklist manual di atas sudah lulus otomatis.

Storage dan database adalah layanan terpisah. Cleanup yang gagal dicatat dalam localStorage per UID dan dapat diulang; ini hanya daftar penghapusan, bukan offline sync transaksi. Jika browser dibersihkan sebelum retry, object yatim dapat tertinggal dan perlu dibersihkan melalui Dashboard Supabase.
