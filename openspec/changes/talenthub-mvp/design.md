## Context

Tech Satu Solusi is building TalentHub as a demo for Mudita to win a full‑build contract. The MVP focuses on visual polish, not production‑grade backend. The demo is single‑tenant, no auth, runs locally with seeded data. Tech stack: Bun + React + Vite + TypeScript front‑end; Hono API; Drizzle ORM + SQLite (migrate to PostgreSQL later). See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**
- Prove the visual concept to win the contract
- Make demo data feel real (Indonesian names, cities, job portals)
- Polish over features (fewer screens, but each looks professional)
- Database swap path: SQLite now, PostgreSQL later

**Non-Goals:**
- Authentication or multi‑user support
- Real WhatsApp API integration (uses `wa.me` deep link instead)
- Resume storage (static URL only)
- Email notifications
- Production deployment

## Decisions

### Single‑page app with React Router
**Why:** Four screens (Dashboard, Kanban, Modal, Form) feel like a real product, not a prototype. React Router is standard, fast to set up.
**Alternatives considered:** Multi‑page SSR (too heavy for demo), no router with state‑based view switching (worse UX).

### Hono over Express
**Why:** First‑class TypeScript support, lightweight, edge‑runtime ready. Matches the Bun + TS stack cleanly.
**Alternatives considered:** Express (older, more boilerplate), Fastify (good but heavier).

### Drizzle ORM + SQLite
**Why:** TypeScript‑native schema definitions, easy migration to PostgreSQL later by swapping the adapter. SQLite needs no setup for the demo.
**Alternatives considered:** Prisma (heavier, more magic), raw SQL (less safe), Supabase (overkill for demo).

### Kanban drag‑and‑drop via @dnd‑kit
**Why:** Lightweight, accessible, TypeScript‑first. Industry standard for React kanban boards.
**Alternatives considered:** react‑beautiful‑dnd (deprecated), react‑dnd (older API).

### WhatsApp reminder as wa.me deep link
**Why:** No API key, no setup, no auth — just opens a pre‑filled WhatsApp message. Perfect for a demo.
**Alternatives considered:** Twilio WhatsApp API (overkill, requires setup), no reminder (loses wow factor).

### Indonesian context, English pipeline labels
**Why:** Indonesian names, cities, and job portals make the demo feel locally relevant. English stage labels are easier for international clients to read at a glance.
**Alternatives considered:** Full Indonesian UI (slower demo comprehension), full English (loses local feel).

### Seeded data via Drizzle migration script
**Why:** Reproducible demo. Reset button or `bun seed` command restarts the demo.
**Alternatives considered:** JSON fixture files (less integrated), manual data entry (time‑consuming).

## Risks / Trade-offs

- **SQLite single‑writer** → Demo runs on one machine; not a real concurrency test. Acceptable for demo scope.
- **No auth** → Demo is open. Anyone with the URL can modify data. Acceptable for a local demo behind a screen share.
- **Hard‑coded stages** → 6 stages are not configurable. Full build can add stage customization.
- **wa.me deep link** → Requires the HR user's machine to have WhatsApp Web. On a demo call, this should work.
- **Drag‑and‑drop accessibility** → @dnd‑kit is accessible but adds complexity. Status dropdown is a fallback.
- **Domain "TalentHub" not trademark‑verified** → Could be a real product. Verify before final branding.
- **Demo data realism** → Names are Indonesian‑sounding but fictional. Mudita may recognize this; that's fine for a demo.

## Migration Plan

Not applicable for demo MVP. Future migration to PostgreSQL:
1. Swap Drizzle adapter from `better-sqlite3` to `node-postgres`.
2. Run `drizzle-kit generate` to regenerate migrations for PostgreSQL dialect.
3. Update connection string in env vars.
4. Test all API routes against PostgreSQL.