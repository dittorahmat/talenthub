# Domain Glossary: Talent Intelligence SaaS

## Core Context & Tenancy

### Organization (Tenant)
Perusahaan atau entitas bisnis yang berlangganan SaaS. Merupakan batas isolasi data (*multi-tenant boundary*). Semua data pekerjaan, pelamar, dan dompet kredit terikat pada satu Organization.

### User
Pengguna yang memiliki kredensial login (dikelola oleh Better Auth) dan merupakan anggota dari Organization dengan peran tertentu (Owner, Admin, Recruiter, Viewer).

### Superadmin
Peran istimewa lintas-tenant (platform operator) yang memiliki akses ke `/superadmin` untuk keperluan pengujian, pemantauan tenant, audit antrean CV, dan manual instant credit adjustment pada dompet organisasi mana pun tanpa payment gateway.

### SaaS Landing Page
Halaman depan publik (`/`) yang fokus mengomunikasikan value proposition Talent Intelligence (AI Screening, ATS Kanban, Scoring Kecocokan), tier harga kredit, dan CTA menuju pendaftaran `/register` serta `/login`.

### Better Auth Integration
Engine autentikasi terpusat yang menangani session cookies, manajemen akun, hash password, dan verifikasi email/domain pada database Cloudflare D1/SQLite.

### Credit Wallet
Dompet saldo non-tunai milik Organization yang menyimpan unit kredit prabayar untuk mengonsumsi layanan AI.
- Dikelola di Cloudflare D1 menggunakan conditional atomic update (`balance >= amount`).
- Mendukung status reservasi: kredit di-reserve saat proses dimulai, dan di-refund otomatis jika file CV corrupt/unreadable.
- Tier harga pembelian: Starter (100 kredit), Growth (500 kredit), Enterprise (2.500 kredit).

### Cloudflare-Native Infrastructure
Stack infrastruktur serverless terintegrasi:
- **Cloudflare D1**: Serverless SQLite database untuk data transaksional dan ledger kredit.
- **Cloudflare Workers / Hono**: Runtime backend API edge.
- **Cloudflare Queues**: Background worker untuk proses antrean ekstraksi & evaluasi batch CV.
- **Cloudflare R2**: Secure object storage dokumen PDF/DOCX CV.

### Credit Ledger
Catatan histori debit/kredit yang immutable (*append-only*), mencatat alasan pemotongan (`CV_SCREENING`, `AI_CHAT`, `CREDIT_PURCHASE`), referensi entitas ID, dan sisa saldo setelah transaksi.

---

## Talent Intelligence Domain

### Job (Lowongan Kerja)
Posisi yang dibuka oleh recruiter dalam suatu Organization, berisi deskripsi, kualifikasi wajib/opsional, dan pertanyaan penggugur (*knockout questions*).

### Candidate (Kandidat)
Profil pelamar individual yang memiliki metadata kontak, riwayat pekerjaan, keterampilan, dan dokumen CV.

### Resume Document (Dokumen CV)
File mentah (PDF/DOCX) yang disimpan di secure object storage (Cloudflare R2/S3). Akses read dibatasi via short-lived presigned URL.

### AI CV Screening
Proses otomatis ekstraksi data (OCR/text extraction) yang dievaluasi menggunakan LLM terstruktur untuk menghasilkan:
- `summary`: Ringkasan profil kandidat.
- `matchedSkills`: Daftar skill yang sesuai kebutuhan Job.
- `missingSkills`: Gap skill yang belum terpenuhi.
- `score`: Nilai kecocokan (0 - 100).
- `verdict`: Rekomendasi sistem (`Hire`, `Consider`, `Pass`).

### Knockout Question
Pertanyaan filter penentu kualifikasi mendasar (misal: "Apakah bersedia ditempatkan di Jakarta?"). Jawaban negatif langsung memicu auto-disqualify.

### Candidate Pipeline
Alur bertahap kandidat dalam tahapan rekrutmen: `Applied` → `Screening` → `Interview` → `Offer` → `Hired` / `Rejected`.

### Free Trial Anti-Abuse
Mekanisme pengamanan untuk mencegah eksploitasi pendaftaran berulang demi mendapatkan kredit gratis:
- **Corporate Email Enforce**: Mewajibkan email berdomain perusahaan (menolak disposable email & publik seperti @gmail.com/@yahoo.com).
- **Phone / WhatsApp OTP Verification**: Verifikasi nomor WhatsApp aktif per pendaftaran.
- **Device & IP Fingerprint Guard**: Pembatasan klaim free trial per IP subnet dan browser device hash.
- **Domain Deduplication**: Satu domain perusahaan (contoh: `@perusahaan.co.id`) hanya berhak mengklaim 1x paket trial untuk satu Organization pertama.
