## Why

HR reviewers currently open every CV PDF manually to judge fit, which is slow in a demo with 20+ candidates. A simulated AI screening step (summary + match score at a glance) shows Mudita's stakeholders the "intelligent shortlisting" story Tech Satu Solusi can sell for the full build, without paying for a real LLM/OCR integration now.

## What Changes

- **Simulated background processing** — After CV upload (`POST /api/applicants/:id/resume`), a mocked AI job runs with a visible `processing` state (2–4s delay), then stores a canned summary + match score. No real OCR/LLM calls.
- **CV summary** — 2–3 sentence Indonesian-flavored summary per candidate (experience, key skills, last role) shown in the detail modal.
- **Job-match scoring (skills + experience)** — Score 0–100 computed from keyword overlap vs. job requirements plus a deterministic experience factor; grade band (Strong / Potential / Weak).
- **At-a-glance UX** — Match-% badge on `CandidateCard` + full "AI Screening" section in `CandidateDetailModal` (score bar, summary, matched/missing skills).
- **Seeded demo data** — Existing seed extended with pre-computed summaries/scores so the Kanban looks intelligent on first load.

## Capabilities

### New Capabilities

- `hr/ai-cv-screening`: Mocked CV screening pipeline — processing state, summary generation, skills+experience match scoring, and at-a-glance display (card badge + modal section).

### Modified Capabilities

_(none — additive mockup feature; existing resume upload and Kanban behavior unchanged)_

## Impact

- Front-end: `CandidateCard.tsx` (badge), `CandidateDetailModal.tsx` (AI section), `KanbanBoard.tsx` (filter/sort by score, processing shimmer).
- Back-end: `src/api/resume.ts` (+ screening fields), `src/db/schema.ts` (+ `applicants` columns: screening status/summary/score), `scripts/seed.ts` (canned summaries).
- No new dependencies; no auth; no real AI vendor. Full build can swap the mock generator for real OCR+LLM behind the same API shape.
