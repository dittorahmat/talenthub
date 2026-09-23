# TalentHub — Applicant Tracking System (Demo MVP)

Interactive ATS mockup for Tech Satu Solusi, built to win the full-build contract with Mudita. HR dashboard + Kanban pipeline + simulated AI CV screening, all running locally on seeded Indonesian demo data.

## Tech Stack

- Bun + React 19 + Vite + TypeScript (frontend)
- Hono API + Drizzle ORM + SQLite, migrate to PostgreSQL later (`drizzle.config.ts`)
- Kanban drag-and-drop via `@dnd-kit`

## Quickstart

```bash
bun install
bun run init-db   # create tables in ./data/talenthub.db
bun run seed      # 3 jobs, 21 applicants, 6 knockout questions
bun dev           # vite on :5173 + API on :3001 (proxy /api -> :3001)
```

Open the Vite URL the terminal prints (note: if `:5173` is taken, Vite bumps to `:5183` — use whichever shows **TalentHub**).

## Demo Walkthrough (60 seconds)

1. **Dashboard** — job cards with applicant counts, search + location filter, New Job, delete per job.
2. **Kanban** — click Lihat Pipeline: 6 stages (Applied → Hired), drag cards between columns, funnel stats on top, search + band filter.
3. **AI screening** — open a candidate: score badge, AI Screening (Demo) section with summary, matched/missing skills, experience years.
4. **Screening inbox** — Upload CV on any job card, drop several PDFs: watch queued → parsing → ready triage with Hire/Consider/Pass verdicts, then promote one to an Applied card.
5. **Try the contrast** — `demo-cv-frontend-strong.pdf` scores Strong on Senior Frontend Engineer; `test-resume.pdf` (blank page) scores Weak. Same file on Product Designer scores differently per role.

## API Overview

| Method | Endpoint | Notes |
|---|---|---|
| GET/POST | `/api/jobs`, `/api/jobs/:id` | list with counts, create, detail with applicants |
| DELETE | `/api/jobs/:id` | cascades to applicants, notes, activities |
| GET/POST | `/api/applicants`, `/api/applicants/:id` | detail includes notes, activities, screening |
| PATCH | `/api/applicants/:id/status`, `/:id/notes` | move stage, add note |
| DELETE | `/api/applicants/:id` | removes notes, activities, screening |
| GET | `/api/applicants/:id/screening` | 404 unscreened, 200 processing/ready |
| POST/GET | `/api/applicants/:id/resume` | upload (5MB, pdf/docx/doc/txt), triggers mock screening |
| GET | `/api/jobs/:id/inbox` | screening inbox items + knockout questions |
| POST | `/api/jobs/:id/inbox` | batch CV upload, per-file validation |
| POST | `/api/inbox/:itemId/promote`, `/dismiss` | 409 on double-promote |
| GET | `/api/whatsapp/:applicantId` | `wa.me` reminder link |
| GET | `/api/health` | `{"status":"ok"}` |

## Honest Mockup Notes

- Screening scores, summaries, verdicts, and experience years are **deterministic simulations**, not real OCR or LLM output. UI carries "(Demo)" labels.
- Experience years derive from an id hash, not CV text. Blank/image PDFs extract no keywords and score Weak.
- Production swap path: replace `mockScreening()` internals with OCR + LLM behind the same API shape.

## Project Layout

```
src/
  server.ts        # Hono app, router mounts, static SPA fallback
  api/             # jobs, applicants, resume, screening, inbox, whatsapp
  db/              # drizzle schema + bun-sqlite init
  pages/           # JobsDashboard, KanbanBoard
  components/      # JobCard, CandidateCard, StageColumn, DetailModal,
                   # AddCandidateForm, PipelineStats, ScreeningInbox, Icons
scripts/           # init-db.ts, seed.ts
openspec/          # change proposals (talenthub-mvp, talenthub-ai-screening, talenthub-screening-inbox)
```

Created with `bun init` (bun v1.4.1). [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
