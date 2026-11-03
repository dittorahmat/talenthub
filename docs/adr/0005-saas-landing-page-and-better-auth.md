# ADR 0005: SaaS Landing Page Redirection, Better Auth Integration, and Superadmin Testing Route

## Status
Accepted

## Context
Aplikasi TalentHub sebelumnya menampilkan 8 modul HR campuran di halaman root (`/`) termasuk placeholder "coming soon" dan asisten umum. Kebutuhan produk saat ini adalah memfokuskan aplikasi murni sebagai **Talent Intelligence SaaS** (AI Candidate Screening, Scoring, ATS Kanban, & Candidate Summaries). Selain itu, sistem otentikasi lama memerlukan standardisasi menggunakan **Better Auth** pada Cloudflare D1/SQLite monolith, serta tersedianya dedicated route `/login`, `/register`, dan route developer `/superadmin` untuk mempermudah testing multi-tenant dan penambahan kredit instan tanpa gateway pembayaran.

## Decision
1. **Refactor Root Route (`/`)**: Menjadikan `/` sebagai halaman SaaS Landing Page profesional yang menjelaskan proposisi nilai Talent Intelligence, fitur AI screening, pricing kredit, dan FAQ, serta mengarahkan CTA ke `/login` dan `/register`. Seluruh selektor 8 modul dicopot dari homepage.
2. **Better Auth Adoption**: Mengimplementasikan Better Auth di endpoint `/api/auth/*` dengan schema D1 SQLite (`user`, `session`, `account`, `verification`) dan mengaitkan profil pengguna dengan `organization_id` serta atribut `role` (`superadmin`, `admin`, `recruiter`).
3. **Dedicated Auth Pages**:
   - `/login`: Form masuk email & password dengan opsi demo credentials one-click.
   - `/register`: Pendaftaran trial organisasi baru dengan perlindungan anti-abuse domain korporat.
4. **Developer Testing Route (`/superadmin`)**:
   - Menghadirkan portal pengujian internal yang dilindungi peran `superadmin`.
   - Memungkinkan inspeksi daftar organisasi, saldo dompet kredit, dan tombol instant credit inject (+100, +500 kredit) untuk testing tanpa simulasi pembayaran Midtrans/QRIS.
   - Menyediakan akun bawaan `superadmin@talenthub.ai` pada skrip seed data.
5. **Core App Redirection**: Seluruh fitur Talent Intelligence (Lowongan, Kanban, Inbox Batch CV, Summary) dipusatkan di bawah route `/dashboard` / `/jobs`.

## Consequences
- Akses ke modul non-talent intelligence (seperti chatbot HR operasional) tidak lagi mengaburkan user experience pengguna baru.
- Proses pengujian end-to-end (registrasi, pemotongan kredit, batch processing) menjadi jauh lebih cepat dan terisolasi dengan adanya portal superadmin.
- Build dan typecheck harus tetap mematuhi guardrail: `bun run test` dan `bun run check`.
