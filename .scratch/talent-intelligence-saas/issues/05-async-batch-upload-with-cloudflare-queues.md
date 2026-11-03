# 05: Async Batch Upload with Cloudflare Queues

**What to build:**
Pengunggahan dan pemrosesan batch banyak file CV sekaligus secara asinkron tanpa memblokir antarmuka web. Recruiter dapat melihat modal estimasi pemotongan kredit sebelum upload, melihat progress bar status setiap file secara real-time, dan membatalkan sisa antrean jika diinginkan.

**Blocked by:** 04: Atomic Reserve and Refund on Failure

**Status:** closed

- [x] Modal konfirmasi pre-flight menampilkan total file, estimasi kredit yang akan dipotong, dan saldo yang tersisa setelah pemrosesan.
- [x] Arsitektur antrean asinkron (worker queue) mengeksekusi ekstraksi dan evaluasi berkas secara berurutan atau paralel terkendali.
- [x] Endpoint status polling / stream status mengembalikan status per file (`QUEUED`, `EXTRACTING`, `EVALUATING`, `READY`, `FAILED`).
- [x] UI Screening Inbox menampilkan kemajuan live batch upload dan hasil triage rekomendasi Hire/Consider/Pass secara instan setelah selesai.
