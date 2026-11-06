# 02: Composite Scoring Algorithm (0-100) & Skill Highlights Engine

**What to build:**
Engine kalkulasi penilaian kecocokan CV skala 0–100 yang terbagi atas tiga pilar objektif: Skill Match (50%), Experience Relevance (30%), dan Supporting Factors (20%). Menyajikan daftar poin plus kecocokan (`matchedSkills`), gap keahlian (`missingSkills`), ringkasan naratif profil kandidat, dan rekomendasi band (*Strong*, *Potential*, *Weak*).

**Blocked by:** 01-multi-format-parser-and-legacy-rejection

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] Formula kalkulasi skor menghitung bobot:
  - Skill match hingga 50 poin berdasarkan rasio kecocokan keahlian terhadap kualifikasi lowongan.
  - Experience relevance hingga 30 poin berdasarkan total tahun dan senioritas kerja relevan.
  - Supporting factors hingga 20 poin berdasarkan kualifikasi pendidikan dan sertifikasi relevan.
- [ ] Nilai skor akhir berada di rentang 0–100 dan dikelompokkan ke dalam band: Strong (>= 75), Potential (50–74), Weak (< 50).
- [ ] Response hasil skrining menyediakan poin plus (`matchedSkills`) dan catatan gap (`missingSkills`) secara terstruktur.
- [ ] Fallback otomatis: jika pemanggilan AI LLM gagal atau kuota habis, evaluasi otomatis beralih ke Smart Heuristic tanpa gagal.
- [ ] Lolos tes kalkulasi skor dan pemetaan kategori.
