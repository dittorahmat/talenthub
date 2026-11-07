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
  - Worker fetch handler wajib mendelegasikan non-API request (`!url.pathname.startsWith('/api')`) langsung ke `env.ASSETS.fetch(request)`.
  - Icon browser `favicon.ico` wajib berformat binary ICO standar, bukan teks SVG XML dengan ekstensi `.ico`.
  - Background queue handler (`queue(batch, env)`) dan request middleware wajib menginisialisasi D1 binding (`initCloudflareD1(env.DB)`) secara idempoten (cegah re-inisialisasi berulang jika instance DB sudah aktif).
  - Skema dan seed remote D1 wajib direproduksi melalui script versioned `scripts/seed-d1.ts` (`bun run seed:d1` / `bun run seed:d1:remote`) dan tersimpan di `data/d1-schema-seed.sql`.
- Untuk runtime local/test (Bun/Vite), sediakan adapter boundary transparan (`src/db/index.ts`) yang membaca binding Cloudflare saat berjalan di Worker, dan fallback ke sqlite/local filesystem hanya saat menjalankan unit test offline.
  - Parameter fungsi adapter seperti `initCloudflareD1(d1Instance: D1Database)` WAJIB menggunakan tipe data domain/Cloudflare kanonik (`D1Database`), bukan `any`.

## 2. Double-Entry Credit Ledger Integrity
- `reserveCredit` mengurangi saldo dompet dan mencatat ledger transaksi dengan tipe `RESERVED` (`amount < 0`).
- `commitCredit` adalah aksi settlement: **TIDAK BOLEH** mengurangi saldo lagi dan **TIDAK BOLEH** mencatat debit minus baru ke ledger jika sudah didebit saat reserve. Cukup tandai status reservasi menjadi `SETTLED` dengan `amount = 0` (audit log).
- `refundCredit` menambah saldo dompet kembali (`amount > 0`) dan mencatat ledger bertipe `REFUND` atau `REFUND_CORRUPTED_FILE`.

## 3. Strict Domain Modeling & Anti-Abuse
- Union types / canonical domain types harus digunakan (hindari `Primitive Obsession` seperti `type: string` bebas pada `CreditTransactionType` atau penggunaan `as any`). Seluruh tipe transaksi harus dideklarasikan secara eksplisit dalam union type `CreditTransactionType` baik di backend maupun di frontend.
- **Better Auth & D1 Asynchronous Compatibility**:
  - Drizzle query yang berjalan di backend monolith Cloudflare Worker maupun test suite WAJIB menggunakan metode asynchronous (`await db.select()...`, `await db.insert()...`). DILARANG memanggil synchronous `.get()`, `.all()`, atau `.run()` secara langsung di route handlers maupun test fixtures karena tidak kompatibel dengan Cloudflare D1 runtime asli.
  - Autentikasi harus mengandalkan cryptographic hashing standar (seperti `bun:password` atau native PBKDF2/Argon2/bcrypt) dan dilarang keras menyimpan/membandingkan password plain text atau pseudo-string prefix.
  - Route terproteksi (seperti `/superadmin` dan API `/api/superadmin/*`) WAJIB memiliki session & role guard yang valid, menolak akses tanpa session token resmi dari Better Auth yang terverifikasi role-nya.
- Pendaftaran free trial wajib memverifikasi keunikan domain email korporat bahkan sebelum OTP diverifikasi, serta menerapkan IP rate-limiting untuk mencegah spamming OTP pada domain yang sama.
- Fitur batch processing wajib menyediakan endpoint dan UI aksi pembatalan antrean (`cancel`) yang otomatis me-refund sisa kredit yang belum diproses.
- Ringkasan kandidat wajib menyediakan secure tokenized public share link di samping opsi PDF dan WhatsApp.

## 4. Automated Verification & Guardrails
- Sebelum menyelesaikan pekerjaan atau membuat PR/commit, agen WAJIB menjalankan:
  1. `bun run test` (memastikan seluruh 14 suite tes integrasi lulus 100%).
  2. `bun run check` (`node scripts/lint-copywriting.mjs && node scripts/lint-code-standards.mjs && bun x tsc --noEmit && vite build && wrangler deploy --dry-run` untuk menjamin tidak ada regresi tipe data TypeScript, copywriting AI-slop, synchronous Drizzle call di route/services/tests, build client, dan bundle Cloudflare Worker).
- **Test Database Self-Healing & Idempotency**:
  - Konfigurasi preload tes (`tests/setup.ts`) otomatis menginisialisasi skema tabel dasar D1/SQLite (`user`, `session`, `account`, `organizations`, `jobs`, `applicants`, `inbox_items`, dll.) secara idempoten jika file database lokal kosong atau belum di-seed, sehingga suite tes tidak boleh berasumsi manual seed sebelum dijalankan.
- **Subagent Concurrency & Scoped Iteration**:
  - Saat mengimplementasikan tiket dalam subagent atau memperbaiki temuan review, gunakan *targeted test execution* (`bun test tests/<specific-file>.test.ts`) selama siklus red-green-refactor untuk menghemat waktu dan token, dan jalankan verifikasi penuh (`bun run check && bun run test`) hanya pada gerbang final integrasi.
- **Service Layer Drizzle Queries**:
  - Seluruh operasi query Drizzle di `src/services/` dan `src/api/` WAJIB menggunakan metode asynchronous (`await db.select()...`, `await db.insert()...`). Pemanggilan synchronous `.get()`, `.all()`, atau `.run()` dilarang keras dan otomatis diblokir oleh linter `scripts/lint-code-standards.mjs`.
- Dokumentasi akun default pengujian dan alur Better Auth tersimpan di [docs/auth-setup.md](docs/auth-setup.md).
- Peta rute halaman utama tersimpan di:
  - `/` (Landing Page) &rarr; `src/pages/LandingPage.tsx`
  - `#/login` &rarr; `src/pages/LoginPage.tsx`
  - `#/register` &rarr; `src/pages/RegisterPage.tsx`
  - `#/workspace` / `#/dashboard` &rarr; `src/pages/JobsDashboard.tsx`
  - `#/jobs?id=X` &rarr; `src/pages/KanbanBoard.tsx`
  - `#/superadmin` &rarr; `src/pages/SuperadminPortal.tsx` (Internal Operator Console)
- Lingkungan eksekusi CLI adalah Windows PowerShell: gunakan perintah native (`Get-ChildItem`, `dir`, `Test-Path`) dan hindari asumsi perintah POSIX seperti `ls`. Saat memeriksa diff git, batasi path pencarian (misal `rtk git diff HEAD -- src/ tests/`) agar hemat token.

## 5. Frontend & UI/UX Design Standards (design-taste-frontend Skill)
- Setiap perubahan, penambahan, dan perombakan antarmuka frontend (Landing Page, Auth, Dashboard, Kanban, Screening Inbox, Modal Detail, Summary Export, Billing, Topup, dan Superadmin) **WAJIB** menerapkan prinsip dan arahan dari skill `design-taste-frontend` (`.agents/skills/design-taste-frontend`).
- **Internal / Operator Tools Zero-Exemption Rule**:
  - Dilarang memperlakukan halaman internal/developer/superadmin sebagai kanvas prototyping instan bebas aturan.
  - Halaman internal/operator wajib dibangun sebagai **Enterprise Operator Console** berstandar tinggi (mengikuti `references/app-screens.md`), dilarang menggunakan inline-style soup (`style={{ ... }}`), dilarang menggunakan emoji dekoratif pada header/tombol, dan dilarang menggunakan kartu metrik dengan angka berwarna-warni tanpa fungsi.
  - **Single Shared Navigation Component (Zero-Duplication)**:
    - Navigasi atas (AppNavbar) wajib diekstrak ke dalam komponen terpadu (`src/components/AppNavbar.tsx`). Dilarang keras menulis ulang atau menduplikasi blok inline style navigasi top-bar berulang kali di `src/App.tsx`.
    - Di rute operator/superadmin (`#/superadmin`), navigasi atas wajib menampilkan indikator mode aktif (bukan tombol no-op yang mengklik tautan ke halaman dirinya sendiri) dan menyajikan hierarki single-bar yang bersih tanpa menumpuk header berulang di canvas.
  - **CSS Layering & Specificity Integrity**:
    - Seluruh custom CSS resets dan base element styling di `src/index.css` WAJIB dibungkus di dalam `@layer base { ... }`. DILARANG menaruh unlayered wildcard reset (`* { margin: 0; padding: 0; }`) di luar layer karena akan menimpa specificity utility class Tailwind v4 (`:where(.space-y-8 > :not(:last-child))`, `p-6`, tabel padding, dsb.) dan merusak layout menjadi gepeng/berdempet.
  - **Theme & Palette Consistency**: Seluruh halaman admin/operator WAJIB menggunakan palet tema terpadu aplikasi (Light Slate Palette: background `#F8FAFC`, panel/card `bg-white`, border `border-slate-200`, aksen teal/slate), DILARANG membuat dark terminal terisolasi kecuali jika aplikasi secara eksplisit mendukung dark mode sistematis di seluruh halaman.
  - **Spacious Layout & Anti-Dempet Standards**:
    - **Page Shell**: Halaman konsol/dashboard wajib menggunakan layout kanvas lapang (`max-w-7xl mx-auto px-6 md:px-8 py-8 md:py-10 space-y-8`), dilarang menumpuk section tanpa margin/gap vertikal lega (`space-y-8`).
    - **Card Framing**: Setiap panel utama (KPI, Formulir Mutasi, Tabel Data, Log Audit) WAJIB dibungkus dalam kontainer kartu mandiri (`bg-white border border-slate-200 rounded-xl shadow-xs`) dengan padding internal lega `p-6` s/d `p-8`. DILARANG menyatukan seluruh metrik atau tabel dalam satu lembar flat tanpa card frame terpisah.
    - **Form Grid & Controls**: Formulir input wajib dipecah menjadi baris-baris terstruktur jika memiliki catatan teks/alasan audit. Dilarang menjejalkan dropdown, nominal, text description, dan tombol submit ke dalam 1 baris sempit. Tombol aksi form wajib memiliki tinggi standar yang proporsional (`py-2.5 px-4`).
    - **Table Cell Padding**: Sel tabel data (`th`, `td`) wajib memiliki ruang vertikal dan horizontal yang nyaman (`py-4 px-6`), dilarang menggunakan padding sel yang rapat/gepeng (`py-1` s/d `py-2`) yang menyerupai spreadsheet mentah.
  - **Strict Domain Modeling in Views**: Seluruh struktur data tampilan (seperti list item, antrean, dan tabel transaksi) wajib memiliki interface tipe data domain kanonik yang tegas; dilarang menggunakan `any`, `any[]`, atau type assertion sembarangan (`as Type`).
  - **Scope Discipline in Refactoring**: Saat merapikan/menyeragamkan styling tampilan (UI restyle task), dilarang merombak kontrak API backend atau menambah fitur mutasi data tak diminta tanpa kesepakatan eksplisit. DILARANG mengubah nama key payload request (misal: mengubah `note` menjadi `description`) atau memalsukan tipe response (`as Type` ad-hoc) yang bertentangan dengan implementasi route backend yang sesungguhnya.
  - **Side-Effect Free Controls**: Tombol utilitas pembantu input form (seperti tombol Quick Presets angka `+50`, `+100`, dsb.) hanya bertugas mempopulasi/mengisi nilai input form secara reaktif; DILARANG memicu mutasi data / auto-submit ke backend secara implisit tanpa penekanan tombol submit/eksekusi utama oleh pengguna.
- **Anti-Generic AI Slop**: Dilarang menggunakan generic AI templates (seperti teks headline 3 baris rata tengah seragam tanpa hierarki, badge hiasan tanpa fungsi, card berulang dengan background gradient pelangi murahan, border tebal tak beraturan, atau floating glowing blur berlebihan).
  - **Zero Decorative Emojis**: Dilarang menggunakan emoji dekoratif sebagai elemen UI (seperti `🛡️`, `🔒`, `⚡`, `🏢`, `🔄`, `✕`, `⚠`, `📱`, `🏦`) di tombol, header, kartu paket, modal, maupun judul halaman. Selalu gunakan ikon SVG monokrom semantik atau tipografi tegas.
  - **No New Inline Styles on Added Elements**: Elemen antarmuka baru (tombol, tautan, teks keterangan, dsb.) WAJIB menggunakan utility classes Tailwind v4 (misal: `className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold..."`) dan DILARANG menambah inline style soup baru (`style={{ ... }}`).
  - **Reusable Domain Helpers & Zero URL Slicing in Components**: Logika normalisasi string domain (seperti normalisasi nomor telepon ke format E.164) dan konstruksi tautan eksternal (`https://wa.me/...`, `mailto:...`) WAJIB diekstrak ke utility helper terpusat (`src/utils/outreach.ts`); dilarang melakukan regex sanitasi atau string slicing URL berulang secara ad-hoc di level komponen view.
  - **Objective Scoring & Pure Metric Weighting**:
    - Formula penilaian skor CV wajib mematuhi bobot ADR secara objektif (Skill 50%, Experience 30%, Supporting Factors 20%). DILARANG memberikan nilai gratis/baseline cuma-cuma pada pilar kualifikasi jika kandidat tidak terbukti memiliki riwayat kualifikasi tersebut.
    - DILARANG menambahkan clamping/capping artifisial tanpa kesepakatan spesifikasi ADR.
  - **No AI Default Colors**: Dilarang keras menggunakan palet warna ungu/indigo instan bawaan template AI (misal `#6366F1`, `bg-indigo-50`, `border-indigo-200`) atau efek gradien murahan (`linear-gradient`) pada kartu dan modal. Seluruh aplikasi wajib patuh pada palet Light Slate & Teal semantik yang harmonis dengan Homepage.
  - **Automated Anti-Slop Enforcement**: Skrip `scripts/lint-code-standards.mjs` secara ketat memindai seluruh direktori `src/` (komponen dan halaman) dari emoji dekoratif dan warna AI default. Pelanggaran akan membatalkan build dan pre-commit check secara otomatis.
- **Spec Delivery Completeness**: Saat mengerjakan tiket vertikal (`/implement-spec` atau restyle tiket), agen WAJIB mengaudit `git diff --stat` terhadap setiap file yang disebutkan dalam kriteria penerimaan tiket (Acceptance Criteria). Dilarang menandai pekerjaan selesai jika ada target file dari tiket yang belum disentuh.
- **Substansi & Hierarki Desain**:
  - Halaman publik / marketing (`--sector saas`): Menggunakan tipografi editorial tegas, layout asimetris yang disengaja, konten nyata/substantif, dan preview produk asli.
  - Aplikasi / workspace screens (`--app`): Mengikuti pedoman `references/app-screens.md` (border tenang, label kompak, kontras data tinggi, densitas informasi teratur, status badge fungsional, dan feedback visual real-time tanpa animasi dekoratif lambat).
- **Validasi Visual & Build**: Setiap perubahan UI wajib bebas dari TypeScript type error, lolos verifikasi linter standar (`scripts/lint-code-standards.mjs`), dan lolos build Vite (`bun run check`).
- **Integrity of Callbacks & Workspace Flows**:
  - Saat merapikan/merestrukturisasi modal dan kontrol workspace (seperti `TrialOnboardingModal` dan `WorkspaceSwitcher`), dilarang memutus callback signature seperti `onSuccess(newOrgId)`. ID organisasi yang baru dibuat WAJIB dioper dan otomatis diaktifkan via `setOrganizationId(newOrgId)`.
- **Domain State Preservation**:
  - Dilarang mempersempit union type atau representasi status domain saat merapikan UI (contoh: status kerja `job.remote` yang mendukung `"Yes"`, `"No"`, dan `"Hybrid"` dilarang disederhanakan menjadi ternary binary).
- **Scope Discipline & Test Fixtures**:
  - Hindari menanam credential rahasia/password sembarangan di komponen produksi; gunakan konfigurasi yang jelas atau helper testing yang aman.
  - Setiap rencana pemecahan tiket vertikal wajib diselesaikan secara menyeluruh di seluruh target komponen sebelum menandai selesai.
  - **Consumer Views Parity**: Saat mengimplementasikan fitur data (seperti ranking skor atau penyaringan), agen wajib mengaudit seluruh komponen UI konsumen (misal: `ScreeningInbox` DAN `KanbanBoard`) agar tidak terjadi disparitas perilaku antar-halaman.
- **Line Ending & File Editing Economy (LF Mandatory)**:
  - Seluruh file teks repositori dikonfigurasi menggunakan LF (`.gitattributes`). Dilarang mencampuradukkan CRLF dan LF agar tool modifikasi file (`edit_file`) bekerja secara deterministik.
- **Pre-Commit Automated Guardrails**:
  - Repositori dilengkapi git pre-commit hook (`.git/hooks/pre-commit`) yang otomatis mengeksekusi `bun run check` dan `bun run test`.
  - Agen dilarang melewati hook ini (`--no-verify`). Setiap kegagalan kompilasi TypeScript atau suite tes wajib diperbaiki sebelum commit dapat diterima.
- **PowerShell Tool Economy & Safe File Manipulation**:
  - Hindari eksekusi `node -e` inline dengan string/regex literal kompleks di CLI PowerShell untuk menghindari issue escaping kutip (`SyntaxError`).
  - Selalu prioritaskan penggunaan tool native file editing (`edit_file` atau `write_file`).
  - Hindari mencoba script headless browser ad-hoc (seperti `puppeteer`) yang tidak terdaftar di `devDependencies`; selalu prioritaskan build artifacts inspection (`dist/assets`), verifikasi linter otomatis, dan dev server preview.

## 6. Copywriting & Communication Standards (copywriting Skill)
- Setiap update, penambahan, dan perombakan teks/konten antarmuka (Landing Page, modal onboarding, notifikasi, tombol CTA, error message, dan laporan eksekutif) **WAJIB** menerapkan prinsip dan arahan dari skill `copywriting` (`.agents/skills/copywriting`).
- **Prinsip Utama Copywriting**:
  - **Clarity Over Cleverness**: Utamakan kejelasan pesan daripada kalimat puitis atau metafora abstrak. Pembaca harus langsung paham apa fungsi aplikasi dan tindakan yang diharapkan.
  - **Benefits Over Features**: Tampilkan apa keuntungan nyata bagi pengguna (HR/recruiter/hiring manager), bukan sekadar arsitektur teknis atau jeroan backend.
  - **Specificity Over Vagueness**: Hindari klaim kosong seperti "terbaik di kelasnya" atau "solusi revolusioner". Gunakan angka, waktu pengerjaan, dan bukti nyata (contoh: "20 kandidat gratis", "skrining dalam hitungan detik").
  - **Human Voice & Anti-AI Tells**: Dilarang menggunakan pola kalimat klise AI seperti:
    - Format kontras murahan ("Ini bukan sekadar X, ini adalah Y").
    - Daftar negatif tanpa isi ("Tanpa ribet, tanpa pusing, tanpa repot", "Tanpa biaya X"). Nyatakan proposisi secara afirmatif (misal: "Model bayar sesuai pemakaian", "Skema saldo prabayar fleksibel").
    - Kalimat bertele-tele yang menggantung di banyak koma.
  - **Terminology Consistency**: Hindari mencampuradukkan padanan kata asing dan lokal dalam satu tampilan yang sama (misal: "Kesenjangan Keahlian / Gap" atau "ANTREAN" vs "LEDGER"). Gunakan padanan Indonesia yang konsisten atau pertahankan istilah teknis baku bila telah menjadi konvensi industri.
  - **The Three-Question Gate**: Setiap baris copy wajib lolos tiga uji:
    1. Dapatkah pembaca membayangkannya secara visual/nyata?
    2. Dapatkah klaim tersebut dibuktikan benar atau salah?
    3. Dapatkah kompetitor menulis kalimat yang sama persis (Swap Test)? Jika ya, pertajam dengan proposisi khas TalentHub.
