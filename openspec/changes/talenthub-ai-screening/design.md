## Context

See proposal.md (Why). Current state: `POST /api/applicants/:id/resume` in `src/api/resume.ts` saves the file and does naive `buffer.toString('utf-8')` keyword matching into `applicants.resumeKeywords`. No summary, no score, no processing state. Frontend (`CandidateCard.tsx`, `CandidateDetailModal.tsx`, `KanbanBoard.tsx`) has no screening UI. DB has no screening columns.

## Goals / Non-Goals

**Goals:**
- Believable "AI working in background" demo with zero vendor dependency
- Score + summary visible at a glance (badge + modal) without slowing the Kanban
- Deterministic canned results so the client demo is reproducible
- Same API shape a real OCR+LLM can replace later

**Non-Goals:**
- Real PDF text extraction (pdf-parse/tesseract), real LLM calls, API keys, billing
- Persisted job queues (BullMQ/Inngest) or worker processes
- Configurable scoring weights UI; weights are hard-coded for the demo
- Re-screening history or versioning

## Decisions

### Simulated async job via setTimeout + status column (not a real queue)
**Why:** A real queue is overkill for a mockup; a `screening_status` column (`pending`/`processing`/`ready`) plus a 2–4s `setTimeout` after upload gives the visible "background processing" story with ~20 lines of code.
**Alternatives considered:** BullMQ/Redis worker (heavy infra for demo), synchronous scoring on upload (no visible background step, loses the wow factor).

### Deterministic mock generator seeded by applicant id
**Why:** `score = f(applicantId, keywordOverlap, experienceYears)` with canned Indonesian summary templates guarantees the same candidate always shows the same score — critical for a live sales demo.
**Alternatives considered:** Random scores (embarrassing if a weak CV outscores a strong one mid-demo), real LLM (nondeterministic + cost + latency).

### Score = 60% skills overlap + 40% experience fit
**Why:** Matches the user's chosen "skills + experience" basis and is explainable on a call ("7 of 10 required skills + 4 yrs vs 3 required"). Weights hard-coded in one `scoreScreening()` function.
**Alternatives considered:** Skills-only (ignores seniority story), ML embeddings (not mockable, needs real pipeline).

### Extend `applicants` table, no new table
**Why:** Screening is 1:1 with applicant; six nullable columns (`screening_status`, `screening_summary`, `screening_score`, `screening_band`, `screening_matched`, `screening_missing`, `screening_exp_years`) avoid joins and keep `GET /api/jobs/:id` fast.
**Alternatives considered:** Separate `screenings` table (cleaner long-term, but extra joins + migration complexity for a mockup).

### Polling for processing state, not WebSockets
**Why:** Frontend already refetches on modal open; a 1.5s poll while `status === processing` is enough for a 2–4s mock job. No socket server needed.
**Alternatives considered:** WebSocket/SSE push (real-time wow, but new infra + CORS + Bun socket handling for a 3-second wait).

## Risks / Trade-offs

- **Mock mistaken for real AI** → Mitigation: label UI "AI Screening (Demo)" and document swap path in tasks; never claim real inference.
- **Canned summaries feel repetitive across 22 seeds** → Mitigation: 6–8 summary templates varied by role band + skill mix; seed script distributes them.
- **`buffer.toString` on PDFs yields garbage keywords** → Mitigation: mock generator ignores extracted text quality and derives keywords from existing `resumeKeywords` + job match; acceptable because parsing is simulated.
- **Polling hammers API if modal left open** → Mitigation: stop polling once `ready`, cap at 10 polls.

## Migration Plan

No migration risk (additive nullable columns). Rollback: drop the six columns + revert `resume.ts` screening hook. Future real-AI swap:
1. Replace `mockScreening()` internals with OCR (pdf-parse) + LLM call.
2. Keep response shape (`status/summary/score/band/matched/missing/expYears`).
3. Move `setTimeout` to a real queue when volume demands it.

## Open Questions

- None blocking. Demo copy tone (formal vs. casual Indonesian) can be tuned during implementation without changing specs.
