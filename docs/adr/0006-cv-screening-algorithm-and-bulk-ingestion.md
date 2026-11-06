# Architecture Decision Record: CV Screening Algorithm, Multi-Format Ingestion & Candidate Outreach

## Status
Accepted

## Konteks & Latar Belakang
Recruiter membutuhkan cara cepat dan terukur untuk mengevaluasi puluhan CV sekaligus tanpa mengunggah satu per satu. Sistem memerlukan algoritma skor objektif skala 0–100, penonjolan poin plus/kesenjangan, penolakan format yang tidak kompatibel di awal, serta saluran outreach instan (WhatsApp & Email).

## Keputusan Desain

### 1. Format File Dokumen & Penolakan Awal
- **Format Didukung**: `.pdf`, `.docx`, `.txt`.
- **Penolakan Format Legacy `.doc`**: Ditolak langsung di layer client (file picker dialog & drag-and-drop validation) dengan pesan instruksi: *"Format .doc lama tidak didukung. Mohon simpan ulang sebagai .docx atau .pdf"*.
- **Parsing**:
  - `.pdf`: Stream and text operator parser dengan fallback printable ASCII extraction.
  - `.docx`: Parsing berbasis zip XML pada `word/document.xml`.
  - `.txt`: Buffer decode UTF-8 langsung.

### 2. Algoritma Skor Kecocokan (Skala 0–100)
Skor dihitung dari tiga pilar pembobotan:
1. **Skill Match (Bobot 50%)**:
   Persentase keahlian teknis dan fungsional yang ditemukan di CV terhadap kualifikasi posisi (Required Skills).
2. **Experience Relevance & Seniority (Bobot 30%)**:
   Total tahun pengalaman kerja dan relevansi histori jabatan terhadap tingkatan posisi yang dibuka (misal: 5+ tahun pengalaman relevan mencapai nilai penuh 30 poin).
3. **Supporting Factors (Bobot 20%)**:
   Relevansi latar belakang pendidikan, sertifikasi industri kredibel, dan portofolio proyek.

Skor akhir dikelompokkan ke dalam kategori rekomendasi:
- **Skor >= 75**: Kategori *Strong* &rarr; Rekomendasi *Hire / Panggil Interview*.
- **50 <= Skor < 75**: Kategori *Potential* &rarr; Rekomendasi *Consider / Cadangan*.
- **Skor < 50**: Kategori *Weak* &rarr; Rekomendasi *Pass / Tidak Lolos*.

### 3. Highlight Poin Plus & Kesenjangan (Gap)
- `matchedSkills`: Daftar keahlian dan nilai tambah kandidat yang cocok dengan kebutuhan.
- `missingSkills`: Kesenjangan keahlian yang belum tampak pada CV untuk bahan klarifikasi interview.
- `summary`: Ringkasan profil naratif 2–3 kalimat yang menonjolkan kekuatan utama kandidat.

### 4. Bulk Upload, Queue, & Fault Isolation
- Multi-file dropzone menerima hingga 50 file sekaligus.
- Estimasi kredit ditampilkan sebelum upload dieksekusi.
- File diproses melalui antrean Cloudflare Queue. Jika terdapat file rusak/unreadable, sistem mengisolasi kegagalan pada file tersebut, me-refund kredit secara otomatis, dan membiarkan file valid lainnya tetap masuk ranking.
- Hasil skrining otomatis terurut berdasarkan skor tertinggi (*ranking order*).

### 5. One-Click Candidate Outreach
- **WhatsApp Web Integration**:
  - Normalisasi nomor telepon otomatis ke format standar internasional E.164 (`628...`).
  - Menghasilkan tautan langsung `https://wa.me/{nomor}?text={encodedText}` dengan template sapaan personalisasi otomatis (memuat nama kandidat dan posisi pekerjaan).
- **Email Outreach**:
  - Tautan `mailto:{email}?subject={subjek}&body={isi}` dengan template pembuka siap kirim.
