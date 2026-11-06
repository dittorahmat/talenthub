# 01: Multi-Format Parser & Client-Side Legacy Rejection

**What to build:**
Sistem ekstraksi teks CV yang mendukung format `.pdf`, `.docx`, dan `.txt` secara andal di backend Cloudflare Worker, serta mekanisme validasi input file di antarmuka recruiter yang secara tegas menolak format `.doc` lama sebelum diunggah dengan pesan panduan konversi yang jelas.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] Komponen upload file di frontend memiliki `accept=".pdf,.docx,.txt"` dan memvalidasi file drag-and-drop: file bereksistensi `.doc` ditolak langsung di browser dengan pesan user-friendly bahwa format `.doc` tidak didukung dan harus dikonversi ke `.docx` atau `.pdf`.
- [ ] Parser backend (`src/services/aiScreeningService.ts` atau parser helper) mampu mengekstrak teks bersih dari file `.docx` (melalui parsing zip xml `word/document.xml`), file `.pdf`, dan file `.txt`.
- [ ] File corrupt atau kosong memicu error penanganan dokumen rusak yang terisolasi tanpa merusak request lainnya.
- [ ] Lolos tes unit dan tes integrasi parsing file.
