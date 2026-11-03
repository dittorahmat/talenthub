# 07: Anti-Abuse Free Trial Onboarding

**What to build:**
Sistem onboarding pendaftaran aman dari eksploitasi trial. Pendaftaran baru dari perusahaan terverifikasi mendapatkan 15-20 trial credit gratis, dengan proteksi ketat: penolakan email domain publik/disposable, batas 1x klaim trial per domain perusahaan, dan verifikasi OTP WhatsApp.

**Blocked by:** 02: Credit Wallet and Header Pill

**Status:** completed

- [x] Validator email saat registrasi memfilter domain publik umum (`gmail.com`, `yahoo.com`, dsb.) dan disposable email provider.
- [x] Logika organisasi memverifikasi keunikan domain email: hanya organisasi pertama dari domain `@namapt.com` yang mendapatkan free trial credits.
- [x] Verifikasi kode OTP WhatsApp sebelum akun dan kredit gratis diaktifkan.
- [x] Pencatatan riwayat klaim trial untuk mencegah eksploitasi dari IP / device fingerprint yang sama.
