# 04: End-to-End Navigation, Workspace Guard & Production Build Verification

**What to build:**
Pengkabelan router SPA menyeluruh di `App.tsx` yang menghubungkan landing page publik, login, register, superadmin portal, dan workspace Talent Intelligence utama, serta verifikasi build dan test suite 100% lulus.

**Blocked by:** 02-better-auth-and-pages, 03-superadmin-portal

**Status:** ready-for-agent

- [x] Routing SPA via hash route (`#/`, `#/login`, `#/register`, `#/superadmin`, `#/workspace`)
- [x] Header bar workspace Talent Intelligence dengan info user aktif dan tombol logout
- [x] Akses tombol `🛡️ Superadmin Panel` bagi akun dengan role superadmin
- [x] Seluruh 7 suite tes integrasi lulus 100% (`bun run test`)
- [x] Verifikasi build client dan dry-run bundle Cloudflare Worker (`bun run check`)
