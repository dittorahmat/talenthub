# Authentication & Testing Setup

Dokumentasi konfigurasi sistem autentikasi Better Auth dan cara membuat akun operator untuk pengujian lokal maupun Cloudflare Workers.

## 1. Engine & Hash Standard
- Menggunakan engine autentikasi **Better Auth** dengan cryptographic scrypt/PBKDF2 hash via `better-auth/crypto` (`hashPassword` & `verifyPassword`).
- Dilarang membandingkan atau menyimpan password dalam bentuk plaintext atau pseudo-prefix (`hashed_...`).

## 2. Operator Accounts

Seed data tidak lagi memuat kredensial apa pun. Akun operator dibuat secara eksplisit lewat environment variable:

```powershell
$env:SUPERADMIN_EMAIL="ops@perusahaan.co.id"
$env:SUPERADMIN_PASSWORD="<kata-sandi-kuat>"
bun run seed
```

Untuk akun demo recruiter, set `DEMO_USER_EMAIL` dan `DEMO_USER_PASSWORD` dengan cara yang sama. Tanpa variabel tersebut, seed hanya membuat organisasi, lowongan, pelamar, dan dompet kredit — belum ada akun yang bisa dipakai masuk.

Jangan menuliskan kata sandi ke dalam repository, dokumentasi, atau bundle frontend. Simpan hanya di secret manager atau environment lokal.

## 3. Session & Storage
- Session disimpan di tabel `session` Cloudflare D1 / SQLite dan dikirim via cookie `better-auth.session_token` (HTTP-only) atau header `Authorization: Bearer <token>`.
- Route `/api/superadmin/*` dan UI `#/superadmin` dilindungi session guard yang memvalidasi `role === 'superadmin'`. Tidak ada bypass key.
- Tenant aktif selalu berasal dari `user.organizationId` pada session. Header `x-organization-id` hanya diterima bila nilainya sama dengan organisasi pada session; selisih nilai ditolak dengan `403`.
