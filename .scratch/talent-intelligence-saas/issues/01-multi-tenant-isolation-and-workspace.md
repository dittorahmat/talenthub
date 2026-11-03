# 01: Multi-tenant Isolation and Workspace

**What to build:**
Pengguna dapat memilih atau beralih organisasi (workspace). Setiap operasi data pekerjaan (jobs), pelamar (applicants), dan aktivitas terikat secara ketat pada `organization_id` aktif sehingga data antar-perusahaan terisolasi sempurna.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Skema database Drizzle mendefinisikan tabel `organizations` dan menambahkan kolom `organization_id` pada seluruh entitas inti (`jobs`, `applicants`, `activities`, `notes`).
- [ ] Middleware context Hono mengekstrak dan memvalidasi `organization_id` dari header request (`x-organization-id`).
- [ ] Seluruh endpoint CRUD jobs dan applicants menyaring data berdasarkan `organization_id` dari konteks request.
- [ ] Antarmuka web memiliki indikator organisasi aktif dan switch workspace di navigation header.
- [ ] Pengujian verifikasi memastikan data tenant A tidak bocor saat diakses oleh tenant B.
