# 1. Arsitektur Multi-Tenant & Credit Wallet System

Date: 2026-11-03

## Status
Accepted

## Context
Aplikasi ATS ini bertransformasi dari single-tenant prototype lokal menjadi produk B2B SaaS dengan model monetisasi berbasis kredit/token usage. Diperlukan struktur tenancy yang aman serta manajemen saldo kredit yang konsisten dan akurat (mencegah *race condition* atau *double spending*).

## Decision
1. **Multi-Tenancy Model**: Menggunakan skema *Shared Database, Discriminator Column (`organization_id`)* yang diisolasi di setiap query ORM/SQL demi efisiensi biaya infrastruktur di tahap awal.
2. **Double-Entry Style Credit Ledger**:
   - Setiap pemotongan kredit dicatat dalam tabel `credit_transactions` yang bersifat append-only.
   - Saldo dompet (`credit_wallets.balance`) diupdate dalam database transaction atomik dengan locking (contoh: `SELECT ... FOR UPDATE`).
3. **Storage & Data Retention**:
   - File fisik CV disimpan di Cloudflare R2 dengan private access only (presigned URLs dengan TTL singkat).
   - Menyediakan soft-delete dan permanent purge sesuai regulasi UU Perlindungan Data Pribadi (UU PDP).

## Consequences
- Semua API endpoints dan database operations wajib melewati middleware otentikasi tenant context (`c.get('orgId')`).
- Perlu worker asinkron (queue) untuk proses parsing LLM agar request HTTP tidak timeout saat user mengunggah CV.
