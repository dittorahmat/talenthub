# 04: One-Click Candidate Outreach (WhatsApp & Email Automation)

**What to build:**
Aksi interaksi cepat recruiter ke kandidat langsung dari kartu Kanban, daftar skrining, maupun modal detail kandidat. Sistem menormalisasi nomor telepon kandidat dari CV menjadi format internasional E.164 (`628...`) dan menyediakan tombol satu klik untuk membuka WhatsApp Web dengan template sapaan personalisasi otomatis serta tombol email dengan subjek dan format surat terstandarisasi.

**Blocked by:** 03-bulk-upload-preflight-and-ranking

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] Utilitas normalisasi nomor telepon mengubah berbagai format lokal (seperti `0812...`, `+62812...`, `0812-xxxx-xxxx`) menjadi format standar internasional `62812...`.
- [ ] Tombol "Hubungi WhatsApp" pada kartu kandidat dan modal detail membuka tautan `https://wa.me/628...?text=...` dengan teks sapaan personalisasi yang memuat nama kandidat dan posisi pekerjaan secara rapi.
- [ ] Tombol "Kirim Email" membuka mail client dengan subject dan draft isi pengantar resmi.
- [ ] UI mematuhi panduan desain tanpa emoji dekoratif, menggunakan icon SVG monokrom semantik dan palet tema Light Slate/Teal.
- [ ] Lolos tes integrasi outreach dan verifikasi pre-commit (`bun run check` dan `bun run test`).
