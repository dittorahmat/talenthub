## 1. Database + Verdict Engine

- [x] 1.1 Add `inbox_items` table (job FK cascade, filename/path, status, name/email/phone/keywords, score/band/verdict/rationale, knockout result, duplicate_of, promoted_applicant_id) and `job_knockouts` table to schema + init-db and verify `bun run init-db` creates them
- [x] 1.2 Add verdict derivation (`Strong→Hire, Potential→Consider, Weak→Pass`) + rationale templates to screening engine and verify same input always returns same verdict
- [x] 1.3 Seed 2 knockout questions per demo job and verify `bun run seed` creates them

## 2. Backend Inbox Flow

- [x] 2.1 Create `src/api/inbox.ts` with `POST /api/jobs/:id/inbox` (multipart batch, per-file 5MB + type validation, duplicate check by email/phone/filename) and verify batch of 3 files creates 3 items with statuses
- [x] 2.2 Add simulated per-file pipeline (`queued → parsing → ready` via timed steps) reusing `mockScreening()` plus mocked knockout answers and verify items reach `ready` with score/verdict/rationale
- [x] 2.3 Add `POST /api/inbox/:itemId/promote` (creates `Applied` applicant carrying file/screening, marks item promoted, 409 on already-promoted) and `POST /api/inbox/:itemId/dismiss` and verify promote creates a badged Kanban card
- [x] 2.4 Add `GET /api/jobs/:id/inbox` listing items with verdicts and verify curl returns correct shape

## 3. Frontend Screening Inbox

- [x] 3.1 Add "Upload CV" entry per `JobCard` opening a `ScreeningInbox` job view (dropzone + item list with status progress, verdict pill, rationale, duplicate banner) and verify multi-drop renders items without reload
- [x] 3.2 Add promote flow (editable name/email confirm → card appears in `Applied` with badge) and dismiss action and verify end-to-end in browser
- [x] 3.3 Add verdict display to inbox items and candidate cards (Hire/Consider/Pass alongside score) with "(Demo)" labeling and verify `bun run build` passes

## 4. Integration & Demo Polish

- [x] 4.1 Walk full flow (drop 3 CVs → watch triage → promote one → Kanban badge → band filter) via `bun dev` and verify end-to-end
- [x] 4.2 Curl all inbox endpoints and verify 200s/404s/409 with correct shapes, then `bun run init-db && bun run seed` to restore demo data
- [x] 4.3 Run antislop-ui checklist on new UI and remove-ai-slops pass on new backend files and verify build still green
