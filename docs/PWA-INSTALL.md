# Buka Dicatat di HP tanpa kolom URL

Dicatat memakai PWA dengan `display: standalone`. Kolom URL hilang ketika aplikasi dijalankan dari ikon Home Screen setelah pemasangan. Membuka alamat yang sama di tab Chrome/Safari tetap menampilkan kolom URL; aplikasi web tidak dapat menghapus antarmuka browser secara otomatis.

## 1. Siapkan alamat HTTPS

Gunakan build production (`npm.cmd run build`) dan hosting HTTPS seperti Cloudflare Pages atau Vercel. Langkah deployment tersedia di README. File `.env` perlu terisi sebelum build; untuk deployment melalui Git, isi environment variable di dashboard hosting.

Alamat HTTP berupa IP komputer di jaringan lokal, misalnya `http://192.168.x.x:5173`, tidak memenuhi persyaratan pemasangan PWA normal. `localhost` adalah pengecualian di perangkat yang menjalankan server; `localhost` di HP menunjuk HP itu sendiri.

Tambahkan alamat hosting ke Supabase Authentication → URL Configuration (Site URL dan Redirect URLs). Supabase Project URL di environment tetap alamat backend Supabase, bukan alamat hosting frontend.

## 2. Pasang di Android

1. Buka alamat HTTPS Dicatat dengan Chrome.
2. Tekan tombol `Pasang aplikasi` jika tersedia, atau menu ⋮ → Instal aplikasi / Tambahkan ke layar utama. Jika browser menawarkan pilihan instalasi atau shortcut, pilih instalasi.
3. Selesaikan pemasangan.
4. Buka ikon **Keuangan** dari Home Screen untuk menggunakan tampilan tanpa kolom URL.

## 3. Pasang di iPhone

1. Buka alamat HTTPS Dicatat di Safari.
2. Bagikan → Tambahkan ke Layar Utama.
3. Jika tersedia, aktifkan **Buka sebagai App / Open as Web App**, lalu tekan Tambah.
4. Buka aplikasi dari ikon Home Screen.

## Jika URL masih terlihat

Pastikan yang dibuka adalah ikon aplikasi yang dipasang, bukan tab browser atau shortcut bookmark biasa. Jika ikon lama berasal dari alamat demo HTTP, gunakan alamat HTTPS dan pasang kembali dari alamat tersebut. Navigasi ke situs di luar aplikasi dapat membuka browser dan menampilkan URL lagi.

Petunjuk `Cara pasang` tersedia di Pengaturan. Panel pemasangan pada bagian atas halaman telah dihapus. Sesudah browser mengonfirmasi pemasangan, aplikasi meminta Anda membuka ikon Home Screen; status pemasangan tidak dianggap sama dengan sedang berjalan dalam mode standalone.

Tidak ada proses build APK oleh pengembang. Perilaku pemasangan mengikuti browser/perangkat. Konfigurasi manifest dapat diperiksa pada build lokal; hilangnya antarmuka browser perlu diuji pada HP setelah pemasangan nyata.

Referensi: [Install PWA](https://web.dev/learn/pwa/installation), [Persyaratan instalasi](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [Safari iPhone](https://support.apple.com/en-in/guide/iphone/iphea86e5236/ios).
