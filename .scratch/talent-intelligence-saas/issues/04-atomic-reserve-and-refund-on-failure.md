# 04: Atomic Reserve and Refund on Failure

**What to build:**
Mekanisme proteksi saldo kredit. Apabila berkas CV yang diunggah recruiter corrupt, terenkripsi password, atau tidak dapat di-parse oleh sistem, saldo kredit yang sempat di-reserve otomatis di-refund kembali ke dompet organisasi secara transparan.

**Blocked by:** 03: Single CV Real AI Screening and Deduction

**Status:** ready-for-agent

- [ ] Transaksi kredit mendukung status transisi: `RESERVED` -> `SETTLED` (sukses) atau `REFUNDED` (gagal).
- [ ] Pipeline parsing mendeteksi kegagalan ekstraksi dokumen atau error respon LLM dan memanggil fungsi `refundCredit()` secara otomatis.
- [ ] Mutasi pengembalian saldo dicatat ke tabel `credit_transactions` dengan tipe `REFUND_CORRUPTED_FILE`.
- [ ] Antarmuka UI menampilkan status peringatan yang jelas ("File tidak terbaca - 1 Kredit dikembalikan") tanpa mengurangi saldo pengguna.
