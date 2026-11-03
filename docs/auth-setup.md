# Authentication & Testing Setup

Dokumentasi konfigurasi sistem autentikasi Better Auth dan kredensial default untuk pengujian lokal maupun Cloudflare Workers.

## 1. Engine & Hash Standard
- Menggunakan engine autentikasi **Better Auth** dengan cryptographic scrypt/PBKDF2 hash via `better-auth/crypto` (`hashPassword` & `verifyPassword`).
- Dilarang membandingkan atau menyimpan password dalam bentuk plaintext atau pseudo-prefix (`hashed_...`).

## 2. Seed Accounts for Development & Testing
Database seed (`scripts/seed.ts`) telah mengonfigurasi dua akun default:

| Role | Email | Password | Kegunaan |
| :--- | :--- | :--- | :--- |
| **Superadmin** | `superadmin@talenthub.ai` | `Admin123!@#` | Akses portal superadmin (`#/superadmin`), inspeksi semua tenant, dan manual instant credit adjustment (+100, +500). |
| **HR Recruiter** | `recruiter@tech1solusi.com` | `Demo123!@#` | Akses workspace Talent Intelligence (`#/workspace`), Jobs, Kanban, AI CV Screening, dan Billing Top-up. |

## 3. Session & Storage
- Session disimpan di tabel `session` Cloudflare D1 / SQLite dan dikirim via cookie `better-auth.session_token` atau header `Authorization: Bearer <token>`.
- Route `/api/superadmin/*` dan UI `#/superadmin` dilindungi session guard yang memvalidasi `role === 'superadmin'`.
