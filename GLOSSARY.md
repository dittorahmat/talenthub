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
File dokumen pelamar dalam format `.pdf`, `.docx`, atau `.txt` yang disimpan di Cloudflare R2. Format legacy `.doc` ditolak di layer validasi awal dengan pesan panduan konversi ke `.docx`. Akses dokumen dibatasi melalui short-lived signed URL.

### Candidate Score (Skor Kecocokan)
Nilai numerik komposit skala 0–100 yang merefleksikan tingkat kecocokan profil kandidat terhadap kriteria Job Posting:
- **Skill Match (50%)**: Rasio keterampilan kandidat terhadap kualifikasi wajib/opsional posisi.
- **Experience Relevance (30%)**: Relevansi posisi terdahulu dan total tahun pengalaman kerja.
- **Supporting Factors (20%)**: Nilai tambah dari latar belakang pendidikan, sertifikasi, atau portofolio relevan.

### AI CV Screening
Proses otomatis ekstraksi teks dan analisis semantik kandidat terhadap posisi lowongan, menghasilkan:
- `score`: Nilai kecocokan (0 - 100).
- `matchedSkills`: Daftar keterampilan/poin plus kecocokan.
- `missingSkills`: Kesenjangan keterampilan terhadap kebutuhan lowongan.
- `summary`: Ringkasan naratif kecocokan dan pertimbangan teknis.
- `band`: Kategori kecocokan (`Strong`, `Potential`, `Weak`).
- `verdict`: Rekomendasi sistem (`Hire`, `Consider`, `Pass`).

### Bulk Resume Ingestion
Alur unggah massal multi-file CV (PDF, DOCX, TXT) sekaligus ke antrean Cloudflare Queue dengan estimasi saldo kredit sebelum proses dimulai, otomatisasi debit/refund, dan penataan peringkat hasil (*ranking*) terurut dari skor tertinggi.

### One-Click Candidate Outreach
Fitur interaksi langsung recruiter ke kandidat dengan satu klik melalui tautan resmi WhatsApp Web (`https://wa.me/<nomor>?text=...`) dan email (`mailto:<email>?subject=...`).

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

---

## ATS Workflow Extensions

### Public Career Portal (Portal Karir Publik)
Halaman web publik terisolasi per tenant (`/careers/:org-slug`) yang menampilkan daftar lowongan aktif dan formulir pendaftaran mandiri pelamar. Memproses upload CV dan validasi knockout questions langsung ke antrean screening tanpa login.

### Candidate Self-Apply Form
Formulir aplikasi publik tempat pelamar mengunggah berkas CV, mengisi informasi kontak, dan menjawab pertanyaan kualifikasi.

### Interview Scorecard
Instrumen penilaian terstruktur multi-evaluator di dalam profil pelamar yang memuat rubrik evaluasi kualitatif, kriteria teknis/kultural, dan rekomendasi hiring dari interviewer.

### Collaborative Activity Notes
Umpan catatan internal (*team comments*) pada profil pelamar yang memungkinkan recruiter dan hiring manager mendiskusikan kesan wawancara dan melampirkan konteks evaluasi secara internal (tersembunyi dari publik).

### Outreach Message Template
Draf pesan komunikasi siap pakai untuk saluran WhatsApp dan Email yang mendukung substitusi variabel dinamis (`{{candidate_name}}`, `{{job_title}}`, `{{company_name}}`) untuk percepatan follow-up dan penolakan santun.

### Custom Pipeline Stages
Tahapan seleksi fleksibel yang dapat dikonfigurasi per posisi lowongan kerja (menggantikan status fixed hardcoded) dengan tetap menjaga mapping ke terminal state (`Hired`, `Rejected`).
