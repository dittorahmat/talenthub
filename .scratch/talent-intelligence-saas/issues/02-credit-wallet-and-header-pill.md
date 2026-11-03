# 02: Credit Wallet and Header Pill

**What to build:**
Sistem dompet kredit untuk setiap organisasi. Pengguna dapat melihat sisa kredit secara langsung di bilah navigasi atas (Header Pill `⚡ X Kredit`), melihat riwayat transaksi kredit (ledger), dan transaksi pemotongan saldo berjalan secara atomik menggunakan conditional update untuk mencegah saldo negatif.

**Blocked by:** 01: Multi-tenant Isolation and Workspace

**Status:** ready-for-agent

- [ ] Tabel `credit_wallets` dan `credit_transactions` didefinisikan dengan relasi ke `organizations`.
- [ ] API endpoint `GET /api/wallet` mengembalikan saldo aktif dan mutasi transaksi terakhir.
- [ ] Fungsi helper transaksi kredit atomik (`deductCredit`, `addCredit`, `reserveCredit`, `refundCredit`) dengan conditional guard (`balance >= amount`).
- [ ] Komponen Header menampilkan badge kredit interaktif real-time dengan tombol Top Up.
- [ ] Modal/halaman ringkasan riwayat ledger kredit menampilkan datetime, deskripsi transaksi, dan pergeseran saldo (+/-).
