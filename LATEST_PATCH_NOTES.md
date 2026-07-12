# Fancy Website — Latest ZIP Rework

Patch ini dibuat langsung dari arsip terbaru `fancywebsite-main.zip` yang dikirim user. Data produk, kategori, transaksi, redeem code, leaderboard, dan ticket yang sudah ada tidak ditimpa. Hanya `data/settings.json` ditambah field konfigurasi yang sebelumnya belum tersedia.

## Arah visual

- Warna publik dominan orange solid: `#f97316`, hover `#ea580c`.
- Charcoal: `#1c1917`.
- Off-white: `#fffdf9` dan `#faf8f5`.
- Tidak memakai gradient baru pada Home, Store, Support, navbar, modal, product card, dan footer.
- Font heading: **Outfit**.
- Font isi: **Plus Jakarta Sans**.
- Bug font lama diperbaiki: stylesheet Google Fonts sekarang benar-benar dimuat pada SSR. Event handler string pada link preload sebelumnya tidak dapat diandalkan sehingga browser bisa tetap memakai font fallback.

## Home

- Struktur panel status server yang sudah disukai dipertahankan.
- Java IP, Bedrock IP, dan Bedrock Port tetap dipisah.
- Hero dan section fitur diselaraskan dengan identitas orange/charcoal tanpa mengubah mekanisme status server.
- Rank Famous diganti menjadi Creator Program yang lebih jelas dan tidak meniru warna referensi.
- URL pendaftaran Famous dapat diatur melalui Admin Panel (`famous_apply_url`).

## Store dan product card

- Judul Store memakai warna solid, bukan gradient.
- Category key dinormalisasi dari slug atau ID sehingga klik kategori tetap bekerja pada data lama maupun kategori tanpa slug.
- State kategori aktif disinkronkan dengan `?category=` dan kembali ke Semua bila kategori tidak tersedia.
- Fetch katalog menerima array kosong sebagai data valid sehingga produk lama tidak tertinggal di UI.
- Product icon dipilih otomatis berdasarkan kategori/nama produk; admin tidak perlu mengatur ikon satu-satu.
- Fallback otomatis tersedia bila gambar kosong atau gagal dimuat.
- Benefit expand/collapse, diskon, platform, batas pembelian, dan harga tetap tersedia.
- Checkout modal memperbaiki reference yang sebelumnya belum didefinisikan, focus trap, Escape, scroll lock, dan focus restore.

## Support dan Discord ticket

- Kategori Support dan tab Buat Ticket/Ticket Saya dibuat ulang dengan active state yang jelas dan responsive.
- Bug klik kategori ketika belum login diperbaiki: kategori yang dipilih disimpan, kemudian form yang benar otomatis dibuka setelah login berhasil.
- Ticket website dapat membuat channel Discord privat melalui Discord Bot REST API.
- Pesan web diteruskan ke Discord, dan balasan manusia dari Discord ditarik kembali ke percakapan web.
- Staff dapat mengubah status melalui command Discord yang didokumentasikan di `DISCORD_TICKET_SETUP.md`.
- Token sesi tidak lagi dikirim lewat query string SSE pada client baru; EventSource memakai cookie same-origin agar token tidak bocor ke log/CDN/referrer.
- Timestamp pesan pertama ticket sekarang tersimpan dengan benar.

## Discord webhook emoji

Mapping custom emoji ada di `lib/discord-emojis.js` dan dipakai oleh webhook transaksi, status pembayaran, support, test webhook, serta Discord ticket bridge. Alias lama `buy`, `devv`, dan `cs` tetap tersedia.

## Navbar, login, dan footer

- Navbar memiliki active state, mobile menu, outside-click close, Escape close, route-change close, dan body scroll lock.
- Login modal memakai layout orange/charcoal, Java/Bedrock selector, focus trap, Escape, timer cleanup, dan prefix Bedrock yang aman.
- Footer diisi dengan identitas server, sosial, Java IP, Bedrock IP, Bedrock Port, navigasi, support, CTA, serta legal notice.

## Vercel / package manager

- `package-lock.json` tidak digunakan.
- Project memakai `pnpm@10.14.0` dan `pnpm-lock.yaml`.
- `vercel.json` tidak lagi memaksa `npm install`; build memakai `pnpm run build`.
- Script `dev` dan `start` mengikuti environment `PORT`, sehingga lebih portable untuk Vercel, VPS, dan Pterodactyl.
- README sekarang memakai perintah pnpm agar error npm `Exit handler never called!` tidak terulang.

## Perbaikan tambahan

- Background URL dari Admin Panel divalidasi sebelum dimasukkan ke CSS runtime.
- Field publik `hero_subtitle` dan `famous_apply_url` tersedia melalui settings endpoint.
- Placeholder Bedrock Port disamakan ke `19026`.
- `.env.example` sekarang menjelaskan webhook Admin, Player, fallback TX, Report, dan Discord Bot bridge secara lengkap.

## Validasi di sandbox

- 55 file JavaScript/JSX berhasil diparse: 0 syntax error.
- Seluruh literal nama `Icon` diperiksa: 0 ikon hilang.
- CSS brace balance: 0.
- `package.json`, `vercel.json`, dan `data/settings.json` valid JSON.
- `package-lock.json` tidak ada; `pnpm-lock.yaml` tersedia.
- `git diff --check`: bersih.

Production build tidak dijalankan di sandbox ini karena akses registry internet tidak tersedia dan dependency belum terpasang. Lockfile serta konfigurasi Vercel sudah disiapkan untuk instalasi reproducible melalui pnpm.
