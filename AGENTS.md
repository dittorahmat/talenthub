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
- Union types / canonical domain types harus digunakan (hindari `Primitive Obsession` seperti `type: string` bebas pada `CreditTransactionType` atau penggunaan `as any`). Seluruh tipe transaksi harus dideklarasikan secara eksplisit dalam union type `CreditTransactionType`.
- **Better Auth & D1 Asynchronous Compatibility**:
  - Drizzle query yang berjalan di backend monolith Cloudflare Worker WAJIB menggunakan metode asynchronous (`await db.select()...`, `await db.insert()...`). DILARANG memanggil synchronous `.get()`, `.all()`, atau `.run()` secara langsung di route handlers karena tidak kompatibel dengan Cloudflare D1 runtime asli.
  - Autentikasi harus mengandalkan cryptographic hashing standar (seperti `bun:password` atau native PBKDF2/Argon2/bcrypt) dan dilarang keras menyimpan/membandingkan password plain text atau pseudo-string prefix.
  - Route terproteksi (seperti `/superadmin` dan API `/api/superadmin/*`) WAJIB memiliki session & role guard yang valid, menolak akses tanpa session token resmi dari Better Auth yang terverifikasi role-nya.
- Pendaftaran free trial wajib memverifikasi keunikan domain email korporat bahkan sebelum OTP diverifikasi, serta menerapkan IP rate-limiting untuk mencegah spamming OTP pada domain yang sama.
- Fitur batch processing wajib menyediakan endpoint dan UI aksi pembatalan antrean (`cancel`) yang otomatis me-refund sisa kredit yang belum diproses.
- Ringkasan kandidat wajib menyediakan secure tokenized public share link di samping opsi PDF dan WhatsApp.

## 4. Automated Verification & Guardrails
- Sebelum menyelesaikan pekerjaan atau membuat PR/commit, agen WAJIB menjalankan:
  1. `bun run test` (memastikan seluruh 7 suite tes integrasi lulus 100%).
  2. `bun run check` (`bun x tsc --noEmit && vite build && wrangler deploy --dry-run` untuk menjamin tidak ada regresi tipe data TypeScript, build client, dan bundle Cloudflare Worker).
- Dokumentasi akun default pengujian dan alur Better Auth tersimpan di [docs/auth-setup.md](docs/auth-setup.md).
- Lingkungan eksekusi CLI adalah Windows PowerShell: gunakan perintah native (`Get-ChildItem`, `dir`, `Test-Path`) dan hindari asumsi perintah POSIX seperti `ls`.

## 5. Frontend & UI/UX Design Standards (design-taste-frontend Skill)
- Setiap perubahan, penambahan, dan perombakan antarmuka frontend (Landing Page, Auth, Dashboard, Kanban, Screening Inbox, Modal Detail, Summary Export, Billing, Topup, dan Superadmin) **WAJIB** menerapkan prinsip dan arahan dari skill `design-taste-frontend` (`.agents/skills/design-taste-frontend`).
- **Anti-Generic AI Slop**: Dilarang menggunakan generic AI templates (seperti teks headline 3 baris rata tengah seragam tanpa hierarki, badge hiasan tanpa fungsi, card berulang dengan background gradient pelangi murahan, border tebal tak beraturan, atau floating glowing blur berlebihan).
- **Substansi & Hierarki Desain**:
  - Halaman publik / marketing (`--sector saas`): Menggunakan tipografi editorial tegas, layout asimetris yang disengaja, konten nyata/substantif, dan preview produk asli.
  - Aplikasi / workspace screens (`--app`): Mengikuti pedoman `references/app-screens.md` (border tenang, label kompak, kontras data tinggi, densitas informasi teratur, status badge fungsional, dan feedback visual real-time tanpa animasi dekoratif lambat).
- **Validasi Visual & Build**: Setiap perubahan UI wajib bebas dari TypeScript type error dan lolos build Vite (`bun run check`).
- **Integrity of Callbacks & Workspace Flows**:
  - Saat merapikan/merestrukturisasi modal dan kontrol workspace (seperti `TrialOnboardingModal` dan `WorkspaceSwitcher`), dilarang memutus callback signature seperti `onSuccess(newOrgId)`. ID organisasi yang baru dibuat WAJIB dioper dan otomatis diaktifkan via `setOrganizationId(newOrgId)`.
- **Domain State Preservation**:
  - Dilarang mempersempit union type atau representasi status domain saat merapikan UI (contoh: status kerja `job.remote` yang mendukung `"Yes"`, `"No"`, dan `"Hybrid"` dilarang disederhanakan menjadi ternary binary).
- **Scope Discipline & Test Fixtures**:
  - Hindari menanam credential rahasia/password sembarangan di komponen produksi; gunakan konfigurasi yang jelas atau helper testing yang aman.
  - Setiap rencana pemecahan tiket vertikal wajib diselesaikan secara menyeluruh di seluruh target komponen sebelum menandai selesai.
- **Pre-Commit Automated Guardrails**:
  - Repositori dilengkapi git pre-commit hook (`.git/hooks/pre-commit`) yang otomatis mengeksekusi `bun run check` dan `bun run test`.
  - Agen dilarang melewati hook ini (`--no-verify`). Setiap kegagalan kompilasi TypeScript atau suite tes wajib diperbaiki sebelum commit dapat diterima.
- **PowerShell Tool Economy & Safe File Manipulation**:
  - Hindari eksekusi `node -e` inline dengan string/regex literal kompleks di CLI PowerShell untuk menghindari issue escaping kutip (`SyntaxError`).
  - Selalu prioritaskan penggunaan tool native file editing (`edit_file` atau `write_file`).
