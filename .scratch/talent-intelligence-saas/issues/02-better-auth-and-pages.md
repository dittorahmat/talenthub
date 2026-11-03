# 02: Better Auth Engine & Dedicated Auth Pages

**What to build:**
Sistem autentikasi Better Auth pada backend Hono monolith Cloudflare D1/SQLite dengan tabel schema (`user`, `session`, `account`, `verification`). Menyediakan dedicated UI form `/login` dan `/register` (Corporate Trial Onboarding).

**Blocked by:** 01-saas-landing-page

**Status:** ready-for-agent

- [x] Schema Better Auth (`user`, `session`, `account`, `verification`) di Drizzle D1/SQLite
- [x] API Router `/api/auth/sign-in/email`, `/api/auth/sign-out`, dan `/api/auth/get-session`
- [x] Form halaman `/login` dengan penanganan error dan one-click credentials untuk developer testing
- [x] Halaman `/register` terintegrasi dengan modal anti-abuse corporate trial claim (+20 kredit gratis)
- [x] Seed user default `superadmin@talenthub.ai` dan recruiter demo
