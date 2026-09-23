## Why

TalentHub is a prototype applicant‑tracking system designed for Tech Satu Solusi’s HR team. The current hiring process relies on spreadsheets and email threads, making it slow and error‑prone. A lightweight demo will show Mudita’s stakeholders a live, interactive view of candidate pipelines, helping us win the full‑build contract.

## What Changes

- **New UI** – React + Vite + TypeScript front‑end with four screens: Jobs Dashboard, Kanban Board, Candidate‑Detail Modal, Add‑Candidate Form.
- **Wow‑factor features** – Pipeline stats/funnel chart, hover quick‑actions, WhatsApp‑reminder button, activity timeline, polished empty states.
- **Data** – SQLite via Drizzle ORM with seeded Indonesian‑sounding candidates (names, cities, job‑portal sources).
- **Tech stack** – Bun + React + Vite + TypeScript front‑end; Hono API; Drizzle ORM + SQLite (migrate to PostgreSQL later).
- **Auth** – Skipped for this MVP (demo only).

## Capabilities

### New Capabilities

- `hr/talent-tracking` – Full CRUD of jobs and applicants, pipeline stages, notes, and activities.
- `hr/pipeline-stats` – Funnel conversion chart above the kanban board.
- `hr/quick-actions` – Hover‑based status‑change and WhatsApp reminder.
- `hr/activity-timeline` – Timeline view in candidate‑detail modal.

### Modified Capabilities

_(none – this is a new product)_

## Impact

- Front‑end React components (JobList, JobCard, KanbanBoard, CandidateModal, AddCandidateForm).
- Hono API routes (`/jobs`, `/applicants`, `/status`).
- SQLite database with tables: `jobs`, `applicants`, `notes`, `activities`.
- No authentication flow; demo access is open.