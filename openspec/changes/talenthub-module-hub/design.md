## Context

See proposal.md (Why). Current state: `App.tsx` boots straight into `JobsDashboard` with TalentHub/Tech Satu Solusi branding; no hub, no chat, no assistant API. The flyer (flyer.jpeg) defines the 8-module list and the assistant example thread.

## Goals / Non-Goals

**Goals:**
- Poster-to-product continuity in the first 5 seconds of the demo
- A chat that survives the exact flyer example ("Berapa sisa cuti saya tahun ini?" → balance → Ajukan Cuti)
- Zero new infrastructure; chat answers are static data like seed content

**Non-Goals:**
- Real NLP/intent classification or LLM calls
- Real leave balances, approvals, or HRIS integration
- Any depth in modules 02/04–08 beyond honest preview panels
- Workforce analytics (follow-up change)

## Decisions

### Hub as new App entry, existing screens untouched behind it
**Why:** `App.tsx` gains a `view` state (`hub | jobs | assistant`); the jobs flow renders exactly as today once tile 03 is clicked. No Kanban/inbox code changes, so regression risk is near zero.
**Alternatives considered:** Hub as a route alongside (needs router — the app is state-based, adding react-router now is churn), hub replacing dashboard header (weakens the 8-tile platform story).

### Assistant backend as static map in `src/api/assistant.ts`
**Why:** 12+ Q&A pairs as a keyword→answer map with a tiny scorer (count keyword hits, threshold ≥1, deterministic tie-break by order) needs no table, no migration, no seed changes. `POST /api/assistant/leave` returns a mock reference (`CUTI-2026-XXXX` from a counter + hash) and appends to an in-memory session list.
**Alternatives considered:** DB-backed FAQ table (migration + seed for static demo content — overhead with no demo benefit), real intent classifier (out of mock scope).

### Keyword-hit matcher with explicit fallback
**Why:** Transparent and demo-safe: each FAQ entry lists trigger keywords; best hit wins; no hit → fallback card with HR contact. Never hallucinates because it can only emit seeded text.
**Alternatives considered:** Fuzzy/semantic match (unpredictable on a live call — the one thing a scripted answer must never be).

### Coming-soon panels carry one-paragraph scope each
**Why:** The panel copy is the sales narrative per module (what it will do, what data it needs). Honest "Segera hadir" framing per R-38; zero interactive controls so nothing can break on stage.
**Alternatives considered:** Clickable mockups per module (7 more mock surfaces to build and keep consistent — weeks, not hours).

## Risks / Trade-offs

- **Chat feels dumb on off-script questions** → Mitigation: fallback is graceful and on-brand; demo script sticks to the 12 seeded questions.
- **Sirius rebrand confuses existing demo flow** → Mitigation: TalentHub stays the product name, Sirius becomes the company line ("TalentHub oleh PT. Sirius Global Technologies"); Tech Satu Solusi mention moves to README/openspec history only.
- **In-memory leave list resets on restart** → Mitigation: acceptable for a staged demo; noted in tasks verification (list visible within session).

## Migration Plan

Additive components + router; rollback is reverting `App.tsx` entry to jobs. Future real assistant swaps the static map for retrieval + LLM, keeping request/response shapes.

## Open Questions

- None blocking. FAQ wording and the 12-question set can be tuned during implementation without changing specs.
