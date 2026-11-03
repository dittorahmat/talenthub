# 3. Cloudflare-Native Stack Architecture (D1, Workers/Pages, R2, Queues)

Date: 2026-11-03

## Status
Accepted

## Context
Klien menghendaki solusi serverless yang efisien, berbiaya operasional rendah, dan seluruhnya di-deploy dalam ekosistem Cloudflare (*Cloudflare-Native Stack*), tanpa database terpisah seperti PostgreSQL konvensional.

## Decision
1. **Database Engine: Cloudflare D1 (SQLite at the Edge)**:
   - Menggunakan Cloudflare D1 bersama Drizzle ORM (`drizzle-orm/d1`).
   - Karena D1 berbasis SQLite, penanganan transaksi dompet kredit menggunakan atomic conditional updates (`UPDATE credit_wallets SET balance = balance - :amount WHERE organization_id = :id AND balance >= :amount`) guna mencegah race condition / saldo minus tanpa perlu row-level locks kaku.
2. **Compute & Background Workers**:
   - Backend API dijalankan di **Cloudflare Workers** (atau Cloudflare Pages Functions) menggunakan framework Hono.
   - Pemrosesan antrean batch CV menggunakan **Cloudflare Queues** untuk memproses ekstraksi dan pemanggilan LLM secara background/asinkron.
3. **Storage & AI Engine**:
   - Penyimpanan file CV di **Cloudflare R2** dengan presigned URLs.
   - Ekstraksi teks & evaluasi CV menggunakan API LLM (Gemini Flash) dipanggil langsung dari Cloudflare Workers.
4. **Billing & Tiering**:
   - Volume-based Credit Tiers (100, 500, 2500 kredit).
   - Atomic Reserve & Refund mechanism terintegrasi dalam transaksi D1.

## Consequences
- Mengurangi kompleksitas devops (tidak perlu manage server VPS/Postgres container terpisah).
- Biaya infrastruktur mendekati nol di fase awal (Cloudflare Free/Paid Tier sangat terjangkau).
- Perlu merancang Drizzle schema dan query D1 yang ramah SQLite (foreign keys, atomic update conditional).
