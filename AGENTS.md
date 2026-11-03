# Project Rules & Architecture Guardrails

## 1. Cloudflare Native Stack Rules (Strict - No Mockups when Credentials Exist)
- Kredensial Cloudflare (Wrangler OAuth) tersedia dan terverifikasi di environment lokal/host (`ditto.asnar@gmail.com`).
- **DILARANG** membuat mockup atau in-process memory simulation jika resource Cloudflare asli dapat diakses atau dibuat via Wrangler.
- Resource resmi Cloudflare yang aktif untuk proyek ini:
  - **Cloudflare D1 Database**: `talenthub-db` (Database ID: `3ae01831-0cd3-4093-a9f0-293aca5d70b5`, binding: `DB`).
  - **Cloudflare R2 Bucket**: `talenthub-cvs` (binding: `CV_STORAGE`).
  - **Cloudflare Queue**: `talenthub-cv-queue` (producer binding: `CV_QUEUE`, consumer: `talenthub-cv-queue`).
- File konfigurasi wajib: `wrangler.jsonc`.
- **Monolith Worker Deployment**: Frontend SPA disajikan langsung dari Worker melalui binding `ASSETS` (`./dist`), sehingga backend API, D1, R2, Queues, dan Frontend berjalan terpadu di domain Worker (`https://talenthub.tech1solusi.workers.dev`).
- Untuk runtime local/test (Bun/Vite), sediakan adapter boundary transparan (`src/db/index.ts`) yang membaca binding Cloudflare saat berjalan di Worker, dan fallback ke sqlite/local filesystem hanya saat menjalankan unit test offline.

## 2. Double-Entry Credit Ledger Integrity
- `reserveCredit` mengurangi saldo dompet dan mencatat ledger transaksi dengan tipe `RESERVED` (`amount < 0`).
- `commitCredit` adalah aksi settlement: **TIDAK BOLEH** mengurangi saldo lagi dan **TIDAK BOLEH** mencatat debit minus baru ke ledger jika sudah didebit saat reserve. Cukup tandai status reservasi menjadi `SETTLED` dengan `amount = 0` (audit log).
- `refundCredit` menambah saldo dompet kembali (`amount > 0`) dan mencatat ledger bertipe `REFUND` atau `REFUND_CORRUPTED_FILE`.

## 3. Strict Domain Modeling & Anti-Abuse
- Union types / canonical domain types harus digunakan (hindari `Primitive Obsession` seperti `type: string` bebas pada `CreditTransactionType`).
- Pendaftaran free trial wajib memverifikasi keunikan domain email korporat bahkan sebelum OTP diverifikasi, serta menerapkan IP rate-limiting untuk mencegah spamming OTP pada domain yang sama.
- Fitur batch processing wajib menyediakan endpoint dan UI aksi pembatalan antrean (`cancel`) yang otomatis me-refund sisa kredit yang belum diproses.
- Ringkasan kandidat wajib menyediakan secure tokenized public share link di samping opsi PDF dan WhatsApp.

## 4. Automated Verification & Guardrails
- Sebelum menyelesaikan pekerjaan atau membuat PR/commit, agen WAJIB menjalankan:
  1. `bun run test` (memastikan seluruh 7 suite tes integrasi lulus 100%).
  2. `bun run check` (`vite build && wrangler deploy --dry-run` untuk menjamin tidak ada regresi pada build client dan bundle Cloudflare Worker).
