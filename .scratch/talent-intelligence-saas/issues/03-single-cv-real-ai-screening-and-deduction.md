# 03: Single CV Real AI Screening and Deduction

**What to build:**
Alur screening CV kandidat menggunakan LLM nyata dengan pemotongan kredit otomatis. Ketika recruiter mengunggah file CV PDF pada kandidat, sistem mengekstrak konten teks dokumen, mengevaluasi kesesuaian skill & pengalaman terhadap lowongan via model LLM, memotong 1 kredit dari dompet, dan menampilkan hasil skor serta rincian analisis di modal kandidat.

**Blocked by:** 02: Credit Wallet and Header Pill

**Status:** ready-for-agent

- [ ] Integrasi ekstraktor dokumen teks PDF dan client pemanggil LLM (Gemini Flash / OpenAI compatible) dengan skema response JSON terstruktur (`score`, `summary`, `matchedSkills`, `missingSkills`, `verdict`).
- [ ] Endpoint upload CV `POST /api/applicants/:id/resume` memeriksa saldo dompet: jika cukup, potong 1 kredit dan simpan catatan ledger `CV_SCREENING`.
- [ ] Hasil evaluasi tersimpan di tabel database dan disajikan langsung pada antarmuka Candidate Detail Modal.
- [ ] Jika saldo kredit kosong (`balance == 0`), proses upload/evaluasi ditolak dengan status 402 / error ramah yang mengarahkan untuk Top Up.
