## 1. Database + Mock Engine

- [x] 1.1 Add screening columns to `applicants` (`screening_status`, `screening_summary`, `screening_score`, `screening_band`, `screening_matched`, `screening_missing`, `screening_exp_years`) and verify `bun run init-db` creates them
- [x] 1.2 Implement deterministic `mockScreening(applicant, job)` (60% skills overlap + 40% experience fit, bands Strong/Potential/Weak) with 6–8 Indonesian summary templates and verify same applicant+job always returns same score
- [x] 1.3 Extend seed script with pre-computed screenings for all seeded applicants and verify `bun run seed` then `curl /api/jobs/:id` shows `screening_status: ready` with scores

## 2. Backend Screening Flow

- [x] 2.1 Hook CV upload (`POST /api/applicants/:id/resume`) to set `processing` then complete via 2–4s simulated job and verify response transitions `processing` → `ready` with summary+score
- [x] 2.2 Extend applicant/job detail responses with screening fields and verify `curl GET /api/applicants/:id` and `GET /api/jobs/:id` include them
- [x] 2.3 Add `GET /api/applicants/:id/screening` endpoint returning screening payload and verify curl returns 404 for unscreened, 200 with score breakdown for screened

## 3. Frontend At-a-Glance UX

- [x] 3.1 Add match-% badge to `CandidateCard` (green/amber/gray by band, shimmer while `processing`) and verify Kanban shows badges without layout shift
- [x] 3.2 Add AI Screening section to `CandidateDetailModal` (score bar, band, summary, matched/missing chips, experience years, empty + loading states) with 1.5s polling while processing and verify modal updates without close
- [x] 3.3 Add score-band filter to `KanbanBoard` and verify selecting Strong/Potential/Weak filters cards correctly

## 4. Integration & Demo Polish

- [x] 4.1 Walk full flow (upload CV → processing badge → score appears → modal breakdown → band filter) via `bun dev` and verify end-to-end in browser
- [x] 4.2 Curl all touched endpoints (`resume`, `screening`, `jobs/:id`, `applicants/:id`) and verify 200s with correct screening shape
- [x] 4.3 Label UI "AI Screening (Demo)" and verify seed variety reads naturally across 22 candidates for the client demo

## 5. Delete Candidate + Job

- [x] 5.1 Add `DELETE /api/applicants/:id` and `DELETE /api/jobs/:id` (404 on missing, FK cascade removes dependents) and verify via app.fetch probe
- [x] 5.2 Add delete buttons with `window.confirm` guard: trash icon on `CandidateCard` hover row, "Hapus Kandidat" in `CandidateDetailModal`, delete on `JobCard`; thread `onDelete` through `StageColumn`/`KanbanBoard`/`JobsDashboard` with list refresh and verify `bun run build` passes
- [x] 5.3 Verify delete flows end-to-end (delete candidate removes card, delete job cascades applicants), then `bun run init-db && bun run seed` to restore demo data
