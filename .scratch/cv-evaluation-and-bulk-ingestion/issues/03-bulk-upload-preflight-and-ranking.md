# 03: Bulk Upload Dropzone, Pre-Flight Credit Check & Auto-Ranking

**What to build:**
Pengalaman unggah massal (*bulk upload*) multi-file CV untuk lowongan kerja tertentu. Recruiter dapat men-drop hingga puluhan file CV, melihat pratinjau daftar file beserta estimasi pemakaian kredit dompet, memprosesnya ke antrean background Cloudflare Queue, serta melihat daftar hasil kandidat yang otomatis terurut dari peringkat skor tertinggi ke terendah (*ranking*), dengan mekanisme refund otomatis jika terdapat file corrupt.

**Blocked by:** 02-composite-scoring-and-highlights

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] Dropzone mendukung pemilihan multi-file (hingga 50 file CV: PDF, DOCX, TXT).
- [ ] Terdapat modal konfirmasi *pre-flight* yang menampilkan jumlah file valid, total kredit yang akan di-reserve, dan sisa saldo dompet organisasi saat ini.
- [ ] Antrean memproses dokumen secara batch/asinkron melalui Cloudflare Queue / batch processor, dengan isolasi kegagalan per file: file corrupt/unreadable otomatis di-refund dan diberi status penanda gagal yang jelas.
- [ ] Tampilan Kanban dan tabel hasil skrining otomatis terurut berdasarkan skor kecocokan tertinggi ke terendah (*ranking order*).
- [ ] Lolos tes integrasi bulk upload, reservasi/refund kredit, dan antrean.
