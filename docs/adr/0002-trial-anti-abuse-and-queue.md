# 2. Free Trial Abuse Prevention & Queue Architecture

Date: 2026-11-03

## Status
Accepted

## Context
Model bisnis SaaS mengandalkan pembelian token/kredit prabayar. Pemberian free trial (15-20 kredit awal) sangat rawan dieksploitasi oleh pengguna nakal yang membuat akun berulang menggunakan email gratis/disposable agar tidak perlu membayar.

## Decision
1. **Multi-Layered Anti-Abuse Guard**:
   - **Domain Deduplication**: Memvalidasi domain email perusahaan. Domain public (@gmail, @yahoo) atau disposable email diblokir untuk klaim instant trial, atau dialihkan ke request demo manual.
   - **Company Domain Uniqueness**: Hanya organisasi pertama yang mendaftar dari `@namapt.com` yang mendapatkan free credit. Pendaftar kedua dari domain yang sama otomatis digabung atau tidak mendapatkan trial credit baru.
   - **WhatsApp/SMS OTP Verification**: Nomor telepon recruiter wajib diverifikasi via kode OTP sebelum kredit gratis aktif. 1 Nomor HP = 1x klaim seumur hidup.
   - **Device/IP Rate Limiting**: Membatasi pembuatan akun dari IP / browser fingerprint yang sama dalam kurun waktu 24 jam.
2. **Asynchronous Queue Worker**:
   - Ekstraksi CV dan scoring LLM diproses lewat antrean (worker queue) dengan SSE (Server-Sent Events) untuk live progress bar.
   - Pemotongan kredit dilakukan dengan status `reserved` di awal job, dan di-`commit` setelah parsing sukses (atau `refund` jika file corrupt/gagal diekstraksi).

## Consequences
- Memerlukan integrasi layanan WhatsApp gateway (misal Fonnte/Twilio/Wablas) untuk OTP pendaftaran.
- Tingkat konversi free trial menjadi pelanggan berbayar lebih tinggi karena pengguna yang mendaftar terfilter sebagai entitas bisnis valid.
