# Architecture Decision Record: ATS Core Expansion - Public Career Portal, Custom Pipelines, Collaborative Scorecards & Template Outreach

## Status
Accepted

## Konteks & Latar Belakang
TalentHub awalnya beroperasi sebagai alat *internal screening & parsing* berbasis batch queue. Namun, sebagai sebuah *Applicant Tracking System (ATS)* menyeluruh, recruiter menghadapi 4 titik friksi utama:
1. Tidak ada pintu masuk publik bagi pelamar untuk melamar mandiri (recruiter harus mengunduh CV dari luar lalu mengunggah manual).
2. Tahapan pipeline kaku (hanya 5 tahap default, tidak bisa mengakomodasi tes teknis atau presentasi kasus).
3. Kolaborasi tim pewawancara terbatas (belum ada lembar evaluasi terstruktur / scorecard & internal notes).
4. Komunikasi kandidat berulang masih mengandalkan pengetikan manual di WhatsApp dan Email.

## Keputusan Desain

### 1. Public Career Portal & Candidate Self-Apply (`/careers/:org-slug`)
- Menyediakan endpoint & halaman publik yang merender lowongan aktif milik Organization.
- Struktur URL publik: `#/careers/:orgSlug` (daftar lowongan aktif organisasi) dan `#/careers/:orgSlug/:jobId` (formulir lamaran).
- Pelamar dapat mengisi data diri, mengunggah CV (`.pdf`, `.docx`, `.txt`), dan menjawab *knockout questions*.
- Pengiriman aplikasi publik otomatis membuat entri pelamar di stage awal (`Applied`), mengunggah berkas ke Cloudflare R2, dan diverifikasi oleh Cloudflare Turnstile serta IP rate-limiting untuk menangkal spam bot.
- **Credit Protection Model**:
  - Tiap lowongan memiliki pengaturan `auto_screen_public` (boolean toggle) dan `daily_public_screening_cap` (integer).
  - Jika toggle aktif dan kuota harian mencukupi, sistem mendebit 1 kredit dan mengirim task ke Cloudflare Queue.
  - Jika toggle mati atau kuota harian habis, aplikasi tetap tersimpan di database dan R2 dengan status `Applied` (skor pending), sehingga recruiter dapat memilih kandidat mana yang ingin di-skrining manual via tombol *"Screen with AI"*.

### 2. Custom Pipeline Stages per Job
- Tabel `jobs` menyimpan konfigurasi tahapan seleksi dinamis pada kolom JSON `pipeline_stages`:
  ```json
  [
    { "id": "applied", "name": "Applied", "order": 1, "type": "applied" },
    { "id": "screening", "name": "AI Screening", "order": 2, "type": "screening" },
    { "id": "interview", "name": "Interview", "order": 3, "type": "interview" },
    { "id": "offer", "name": "Offering", "order": 4, "type": "offer" },
    { "id": "hired", "name": "Hired", "order": 5, "type": "hired" },
    { "id": "rejected", "name": "Rejected", "order": 6, "type": "rejected" }
  ]
  ```
- Kolom bersifat fleksibel (bisa menambahkan tahapan seperti `coding_test`, `case_study`, dll.). Jika bernilai `NULL`, sistem fallback otomatis ke template 5 stage baku.

### 3. Interview Scorecard & Collaborative Activity Notes
- Evaluator yang terautentikasi (`Owner`, `Admin`, `Recruiter`) dapat mengisi scorecard evaluasi mandiri per kandidat (skala rubrik 1–5 untuk Technical, Culture Fit, Communication, serta rekomendasi `Strong Yes`, `Yes`, `Neutral`, `No`).
- Profil kandidat menampilkan agregasi skor rata-rata evaluator dan memaparkan breakdown catatan dari masing-masing interviewer.
- Role `Viewer` memiliki hak akses *read-only*.
- Riwayat skor dan catatan evaluasi bersifat rahasia dan tidak pernah terekspos ke tautan *Public Share Link*.

### 4. Outreach Message Templates (WhatsApp & Email)
- Template tersimpan per Organization untuk skenario umum: *Undangan Wawancara*, *Penawaran Kerja (Offer)*, dan *Penolakan Santun (Rejection)*.
- Mendukung dynamic tokens: `{{candidate_name}}`, `{{job_title}}`, `{{company_name}}`, `{{interview_link}}`.
- Integrasi tetap mempertahankan prinsip lightweight edge: normalisasi format E.164 dan tautan `https://wa.me/` serta `mailto:`.

## Konsekuensi & Skema Database
- Skema D1 diperkaya dengan:
  - Penambahan kolom `pipeline_stages`, `auto_screen_public`, dan `daily_public_screening_cap` pada tabel `jobs`.
  - Tabel baru: `candidate_scorecards` (menyimpan skor rubrik multi-evaluator).
  - Tabel baru: `candidate_notes` (activity thread / komentar internal tim).
  - Tabel baru: `outreach_templates` (koleksi template pesan organisasi).

## Roadmap & Phasing Eksekusi
1. **Fase 1: Internal Collaboration & Productivity**:
   - Outreach Message Templates (WhatsApp & Email preset dengan dynamic tokens).
   - Collaborative Scorecard & Internal Activity Notes di Modal Kandidat.
2. **Fase 2: Flexible Pipeline Stages**:
   - Custom Pipeline Stages per Job (kolom JSON `pipeline_stages` & adaptasi Kanban Board).
3. **Fase 3: Public Application Intake**:
   - Public Career Portal & Candidate Self-Apply Form (`#/careers/:orgSlug` & `#/careers/:orgSlug/:jobId`).
   - Cloudflare Turnstile, R2 upload publik, dan perlindungan kredit (`auto_screen_public` toggle & cap).

