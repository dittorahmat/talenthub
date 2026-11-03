# 4. UI/UX Credit Transparency and Candidate Summary Export

Date: 2026-11-03

## Status
Accepted

## Context
Recruiter dan pengguna enterprise membutuhkan transparansi penuh terhadap penggunaan saldo kredit mereka untuk membangun rasa percaya. Selain itu, kolaborasi antara recruiter dan hiring manager sering membutuhkan ringkasan kandidat yang siap dibagikan ke pihak internal secara ringkas.

## Decision
1. **Header Credit Widget & Pre-flight Modal**:
   - Header menampilkan saldo kredit aktif secara real-time (`⚡ 45 Kredit` + CTA "Top Up").
   - Sebelum aksi screening dijalankan (terutama batch upload), modal konfirmasi muncul menginformasikan jumlah kredit yang akan dipotong dan sisa saldo.
2. **Kandidat Summary Delivery**:
   - Hasil screening disajikan di dalam Interactive Detail Modal.
   - Disediakan fitur ekspor / tautan "1-Page AI Summary" yang rapi untuk dibagikan ke Hiring Manager via WhatsApp/Email.
3. **Konfirmasi Final Domain**:
   - Seluruh frontier desain telah disepakati dan dikunci: Fullstack Cloudflare Native (D1, Workers, R2, Queues), Modul 03 Talent Intelligence SaaS, Anti-Abuse Free Trial, dan Pay-as-you-go Credit Wallet.
