# 06: Payment Gateway Credit Top-up

**What to build:**
Pengguna dapat membeli paket kredit token (Starter 100, Growth 500, Enterprise 2500) menggunakan payment gateway lokal (QRIS / Virtual Account), dan saldo dompet kredit otomatis bertambah setelah webhook pembayaran terverifikasi.

**Blocked by:** 02: Credit Wallet and Header Pill

**Status:** completed

- [x] Definisi paket tier kredit (Starter 100 = Rp 250k, Growth 500 = Rp 1jt, Enterprise 2500 = Rp 3.75jt).
- [x] Endpoint `POST /api/billing/checkout` membuat tagihan/invoice transaksi (simulasi / provider Xendit/Midtrans).
- [x] Endpoint Webhook `POST /api/billing/webhook` menerima notifikasi pembayaran sukses dan menambahkan kredit ke dompet organisasi secara aman & idempotent.
- [x] Modal/halaman Top Up di antarmuka web memandu pengguna memilih paket, melakukan pembayaran, dan langsung melihat penambahan kredit secara otomatis.
