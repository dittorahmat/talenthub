## Context

See proposal.md (Why). Current state: single-file upload lives in `AddCandidateForm` (creates the applicant first, CV second) and `POST /api/applicants/:id/resume` runs the mock screening. There is no batch intake, no pre-candidate triage, and no verdict concept — only the 0–100 score and band. `mockScreening()` in `src/api/screening.ts` is the reuse seam.

## Goals / Non-Goals

**Goals:**
- Ten PDFs in, triaged shortlist out, in under a minute of clicking
- Every verdict explainable in one sentence (trend: reasoning over scores)
- Promotion path carries screening forward so Kanban badges work unchanged
- Same mock honesty as before: canned parsing, deterministic results, "(Demo)" labels

**Non-Goals:**
- Real multi-file parsing pipeline (no worker pool, no OCR)
- Editable knockout question builder UI (seeded per-job questions suffice)
- Compare view, WhatsApp drips, self-scheduling, audit export (follow-up changes)
- Resume-file deduplication by content hash (email/phone/filename match is enough)

## Decisions

### Separate `inbox_items` table, not `applicants` with a flag
**Why:** Inbox items are not candidates yet — no status, no pipeline position, dismissable without a trace. A dedicated table (`job_id` FK cascade, filename/path, parse status, extracted name/email/phone/keywords, score/band/verdict/rationale, knockout result, duplicate_of, promoted_applicant_id) keeps the Kanban query clean and makes "dismiss leaves nothing behind" trivially true.
**Alternatives considered:** `applicants` with `status='Inbox'` (pollutes pipeline counts, funnel stats, seed assumptions), in-memory only (lost on refresh, kills the demo if the page reloads mid-call).

### New `src/api/inbox.ts` router reusing `mockScreening()`
**Why:** Endpoints `POST /api/jobs/:id/inbox` (multipart batch), `GET /api/jobs/:id/inbox`, `POST /api/inbox/:itemId/promote`, `POST /api/inbox/:itemId/dismiss` map 1:1 to spec scenarios; scoring stays identical to card scores by calling the same function, so the verdict/score consistency scenario holds by construction.
**Alternatives considered:** Extending `resume.ts` (wrong shape — it is per-applicant, inbox is pre-applicant), client-side only triage (no persistence, refresh loses everything).

### Verdict derived from band, rationale from templates
**Why:** `Strong→Hire, Potential→Consider, Weak→Pass` plus a rationale template naming the top matched skill or the knockout failure. Zero new scoring logic, deterministic like the rest of the mock.
**Alternatives considered:** Separate verdict model (divergence risk between verdict and score — the exact inconsistency the spec forbids).

### Knockout questions as seeded per-job rows, mocked answers
**Why:** A tiny `job_knockouts` table (`job_id`, `question`) seeded with 2 questions per demo job; candidate answers mocked deterministically from the item hash. HR sees the flag and the named failure; no answer-collection UI needed for the mockup.
**Alternatives considered:** UI to author questions per job (real product need, but pure overhead for the demo story), real candidate Q&A flow (needs candidate-facing pages — out of scope).

### Dropzone + inbox as a job-level view, polling like the modal
**Why:** "Upload CV" button on each `JobCard` opens the `ScreeningInbox` view for that job (upload zone on top, item list below, promote/dismiss per item). Reuses the proven 1.5s-poll-while-processing pattern from `CandidateDetailModal`.
**Alternatives considered:** Inbox inside Kanban as a 7th column (mixes pre-pipeline with pipeline, breaks funnel math), separate top-level route (more navigation for no benefit in a two-screen app).

## Risks / Trade-offs

- **Parsing real PDFs is still byte-scan** → Mitigation: same honesty as screening; blank/image PDFs land `Consider`-at-best with rationale "tidak ada teks terbaca", which itself demos graceful degradation.
- **Promotion name/email guessing** → Mitigation: naive extraction (email regex, filename-derived name) shown editable in the promote confirm; HR corrects before creating.
- **Polling N items** → Mitigation: single `GET inbox` poll per view (not per item), stops when no item is `queued`/`parsing`.
- **Verdict/score drift if scoring weights change later** → Mitigation: verdict is computed, never stored independently of band; one function owns both.

## Migration Plan

Additive tables and router; rollback is dropping `inbox_items`/`job_knockouts` and unmounting the router. Future real intake swaps `mockScreening()` call sites and the byte-scan parser for OCR+LLM, keeping item states and verdict shape.

## Open Questions

- None blocking. Knockout question wording per job can be tuned during implementation without changing specs.
