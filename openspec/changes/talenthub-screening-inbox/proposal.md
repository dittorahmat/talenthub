## Why

HR teams receiving dozens of CVs per job do triage by hand: open each PDF, judge fit, retype name and email into the tracker. That manual intake is the slowest part of hiring and the exact pain 2026 ATS trends (agentic intake, explainable screening) address. A bulk-upload screening inbox shows Mudita's stakeholders the highest-wow part of TalentHub first: drop files, get a triaged shortlist with reasoning, promote to the pipeline in one click.

## What Changes

- **Bulk CV upload on the job page** — Multi-file dropzone (PDF/DOCX/TXT, 5MB each) on `JobsDashboard` per job; each file becomes an inbox item with a live `queued → parsing → ready` progress state.
- **Screening inbox (stage 0, before Applied)** — Per-job inbox listing every uploaded file with its AI verdict, score, and one-line rationale; HR promotes an item to a real `Applied` candidate card or dismisses it.
- **Auto-created candidate cards** — Promotion creates the applicant (name/email parsed from the file when present, editable before confirm) with screening already attached; no manual form filling.
- **Duplicate flag** — Upload matching an existing applicant email/phone (or same filename + job) is flagged "sudah melamar" with a link to the existing card instead of a duplicate.
- **Knockout questions** — Per-job optional yes/no questions (e.g. "Bersedia onsite di Jakarta?"); HR answers once per inbox item (mocked candidate answers for the demo), mismatches auto-flag the item.
- **Hire / Consider / Pass verdict** — Every inbox item and card shows a verdict plus one sentence of why, alongside the existing 0–100 score (answers the "black box" complaint from recruiter trends).

## Capabilities

### New Capabilities

- `hr/screening-inbox`: Bulk CV intake, per-file parsing progress, triage verdicts with reasoning, promotion to candidates, duplicate detection, and knockout questions.

### Modified Capabilities

_(none — additive pre-pipeline stage; existing Kanban, screening, and delete behavior unchanged)_

## Impact

- Front-end: `JobsDashboard.tsx` (dropzone + inbox view), new `ScreeningInbox.tsx` component, `KanbanBoard.tsx` (promotion entry point unchanged — promoted cards arrive as `Applied`).
- Back-end: new `src/api/inbox.ts` router (upload batch, item status, promote, dismiss), `src/db/schema.ts` (+ `inbox_items` table), reuse `mockScreening()` from `src/api/screening.ts`.
- No new dependencies; no auth; mocked parsing and verdicts like the existing screening mock. Compare view, WhatsApp drips, self-scheduling, and audit export stay out — follow-up changes.
