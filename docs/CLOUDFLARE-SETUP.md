# Deploy Dicatat melalui GitHub dan Cloudflare Pages

## 1. Siapkan repository GitHub

1. Masuk ke https://github.com dan buat repository bernama `dicatat`.
2. Pilih **Private**. Untuk repository yang akan diisi dari proyek lokal, jangan tambahkan README, license, atau gitignore dari GitHub.
3. Unggah kode dari folder proyek lokal dengan Git atau GitHub Desktop. Pastikan `package.json` berada langsung di akar repository.
4. Sertakan `src`, `public`, `supabase`, `scripts`, `tests`, `docs`, konfigurasi proyek, `package.json`, dan `package-lock.json`.
5. `.gitignore` proyek sudah mengecualikan `.env`, `.env.local`, `node_modules`, `dist`, dan hasil pengujian. Jangan unggah berkas atau folder tersebut. `.env.example` boleh masuk karena hanya berisi contoh.
6. Pastikan kode sudah ada pada branch `main` sebelum menghubungkan Cloudflare.

## 2. Hubungkan Cloudflare Pages

Jika proyek yang sudah dibuat adalah **Workers** (alamat dashboard mengandung `/workers/services/`), proyek itu juga dapat digunakan. Gunakan build command `npm run build` dan deploy command `npx wrangler deploy`. Repository menyediakan `wrangler.jsonc` untuk Static Assets dengan fallback SPA. Isi environment variables di pengaturan **build**, bukan hanya runtime. URL produksi Workers biasanya berakhiran `workers.dev`; gunakan URL sebenarnya itu pada pengaturan Supabase. Langkah Pages di bawah berlaku bila memilih membuat proyek Pages.

1. Masuk ke https://dash.cloudflare.com.
2. Buka **Workers & Pages → Create application → Pages → Connect to Git**. Nama menu bisa sedikit berbeda; pilih alur Pages yang mengimpor repository Git.
3. Hubungkan GitHub. Beri akses hanya ke repository `dicatat`.
4. Pilih repository `dicatat`, lalu mulai setup.
5. Isi konfigurasi berikut:

| Pengaturan | Nilai |
| --- | --- |
| Project name | `dicatat` atau nama unik pilihan Anda |
| Production branch | `main` |
| Framework preset | React (Vite); jika tidak tersedia, gunakan None dan isi manual |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Kosong, jika `package.json` berada di akar repository |

## 3. Isi environment variables sebelum build

Tambahkan pada pengaturan build Cloudflare:

| Nama | Nilai |
| --- | --- |
| `NODE_VERSION` | `24.11.1` |
| `VITE_SUPABASE_URL` | Project URL Supabase, sama seperti `.env` lokal |
| `VITE_SUPABASE_ANON_KEY` | Anon atau publishable key publik, sama seperti `.env` lokal |

Gunakan Project URL, bukan endpoint S3 Storage. Jangan gunakan `service_role` atau secret key. Nama variabel harus mengikuti aplikasi di atas, walaupun contoh Supabase menggunakan nama `VITE_SUPABASE_PUBLISHABLE_KEY`.

Nilai `VITE_` masuk ke aplikasi saat build. Jika nilainya diubah, lakukan deployment ulang. Untuk preview deployment, isi variabel pada lingkungan Preview juga bila ingin preview dapat memakai Supabase.

Klik **Save and Deploy**. Setelah berhasil, catat URL HTTPS produksi yang ditampilkan Cloudflare, misalnya `https://dicatat-anda.pages.dev`.

## 4. Sesuaikan Supabase Auth

1. Buka proyek Supabase → **Authentication → URL Configuration**.
2. Set **Site URL** ke URL HTTPS produksi yang sebenarnya.
3. Pada **Redirect URLs**, tambahkan URL produksi. Jika aplikasi memerlukan callback dengan path tertentu, tambahkan path callback yang digunakan.
4. Pertahankan `http://localhost:5173` untuk pengembangan lokal jika masih digunakan.
5. Simpan pengaturan.

Database dan bucket yang sudah dibuat tidak perlu dibuat ulang karena hosting frontend berpindah.

## 5. Periksa hasil deployment

- Buka URL produksi dan pastikan formulir login muncul, bukan pesan setup Supabase.
- Coba masuk, tambah transaksi, muat ulang, dan pastikan transaksi tetap tersimpan.
- Coba unggah serta buka foto nota.
- Buka URL di ponsel. Pasang melalui menu browser ke Home Screen, lalu buka dari ikonnya untuk tampilan aplikasi tanpa kolom alamat.

Untuk pembaruan berikutnya, commit dan push perubahan kode ke branch `main`. Cloudflare akan build dan deploy otomatis. Perubahan database tetap memerlukan migration SQL di Supabase secara terpisah.

## Referensi

- https://developers.cloudflare.com/pages/get-started/git-integration/
- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://supabase.com/docs/guides/auth/redirect-urls
