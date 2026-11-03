# 03: Internal Superadmin Portal & Development Credit Injection

**What to build:**
Portal pengujian internal superadmin di route `#/superadmin` untuk memonitor multi-tenant, jumlah user, riwayat batch queue, dan instant credit injection ke dompet tenant manapun tanpa payment gateway.

**Blocked by:** 02-better-auth-and-pages

**Status:** ready-for-agent

- [x] Endpoint backend `/api/superadmin/overview` menampilkan ringkasan tenant, dompet, dan antrean batch
- [x] Endpoint backend `/api/superadmin/inject-credit` untuk penambahan saldo kredit instan
- [x] Halaman antarmuka `SuperadminPortal.tsx` di route `#/superadmin`
- [x] Tombol pintasan injeksi kredit (+100, +500 kredit) untuk testing cepat
- [x] Tombol kembali ke Workspace Talent Intelligence
