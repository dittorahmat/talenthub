## 1. Project Setup

- [x] 1.1 Create `package.json` with Bun + React + Vite + TypeScript + Hono + Drizzle + SQLite deps
- [x] 1.2 Create `tsconfig.json`, `vite.config.ts`, and `drizzle.config.ts` with correct settings
- [x] 1.3 Create `src/` directory structure: `components/`, `pages/`, `api/`, `db/`, `seed/`
- [x] 1.4 Add `bun` scripts for dev, build, seed, and verify `bun dev` starts the dev server

## 2. Database Schema

- [x] 2.1 Define Drizzle schema for `jobs` table (id, title, location, remote, postedAt, applicantCount)
- [x] 2.2 Define Drizzle schema for `applicants` table (id, name, email, phone, resumeUrl, source, status, jobId, createdAt)
- [x] 2.3 Define Drizzle schema for `notes` table (id, applicantId, text, author, createdAt)
- [x] 2.4 Define Drizzle schema for `activities` table (id, applicantId, type, description, user, timestamp)
- [x] 2.5 Create migration file and run `drizzle-kit migrate` to create SQLite tables
- [x] 2.6 Verify all tables exist with correct columns by querying the database

## 3. API Routes (Hono)

- [x] 3.1 Create `api/jobs.ts` with GET `/api/jobs` (list all jobs with applicant counts)
- [x] 3.2 Create `api/jobs.ts` with GET `/api/jobs/:id` (single job with applicant list)
- [x] 3.3 Create `api/applicants.ts` with POST `/api/applicants` (create new applicant)
- [x] 3.4 Create `api/applicants.ts` with PATCH `/api/applicants/:id/status` (update status)
- [x] 3.5 Create `api/applicants.ts` with PATCH `/api/applicants/:id/notes` (add note)
- [x] 3.6 Create `api/applicants.ts` with GET `/api/applicants/:id/activities` (activity timeline)
- [x] 3.7 Create `api/whatsapp.ts` with GET `/api/whatsapp/:applicantId` (returns wa.me link)
- [x] 3.8 Verify all API routes return correct JSON by curling each endpoint

## 4. Seed Data

- [x] 4.1 Create `seed/jobs.ts` with 3 Indonesian jobs (Senior Frontend Engineer Jakarta, Product Designer Bandung, DevOps Engineer Surabaya)
- [x] 4.2 Create `seed/applicants.ts` with 20+ realistic Indonesian names (Andi Putra, Dewi Lestari, Budi Santoso, Siti Rahayu, etc.) across all 6 stages
- [x] 4.3 Create `seed/notes.ts` with 2-3 notes per applicant
- [x] 4.4 Create `seed/activities.ts` with activity log entries for status changes and notes
- [x] 4.5 Create `seed/index.ts` that runs all seed scripts and verify `bun run seed` populates the database

## 5. Jobs Dashboard Page

- [x] 5.1 Create `pages/JobsDashboard.tsx` with header, "TalentHub" branding, "+ New Job" button
- [x] 5.2 Create `components/JobCard.tsx` displaying job title, location, remote status, applicant count, "View" button
- [x] 5.3 Add search/filter bar (name, location, status, source) with filtering logic
- [x] 5.4 Add empty state with SVG illustration and "Add Candidate" CTA when no jobs exist
- [x] 5.5 Verify the page renders correctly and clicking "View" navigates to the Kanban board

## 6. Kanban Board Page

- [x] 6.1 Create `pages/KanbanBoard.tsx` with 6 columns (Applied → Phone Screen → Technical → Final Interview → Offer → Hired)
- [x] 6.2 Create `components/StageColumn.tsx` with stage name, count badge, and drop zone
- [x] 6.3 Create `components/CandidateCard.tsx` with avatar, name, stage, time in stage, and hover quick-actions
- [x] 6.4 Implement drag-and-drop between columns using @dnd-kit
- [x] 6.5 Add "Add Candidate" button in last column (Hired) that opens the add candidate form
- [x] 6.6 Verify drag-and-drop updates status and moves card between columns

## 7. Pipeline Stats Component

- [x] 7.1 Create `components/PipelineStats.tsx` with horizontal bar chart showing funnel conversion
- [x] 7.2 Calculate percentages: (stageCount / totalCount) * 100 for each stage
- [x] 7.3 Add click-to-filter: clicking a bar filters the Kanban to that stage
- [x] 7.4 Verify the chart renders above the Kanban and updates when status changes

## 8. Candidate Detail Modal

- [x] 8.1 Create `components/CandidateDetailModal.tsx` with overlay backdrop and close button
- [x] 8.2 Add candidate profile section (avatar, name, email, phone, source, status pill)
- [x] 8.3 Add resume section with "View PDF" and "Download" buttons (static URLs)
- [x] 8.4 Add notes section with "Add a note" input and existing notes list with edit/delete
- [x] 8.5 Add activity timeline component (vertical dots + connector lines)
- [x] 8.6 Add "Move to Next Stage" button that triggers status change
- [x] 8.7 Verify modal opens on card click, closes on backdrop click, and all sections render

## 9. Add Candidate Form

- [x] 9.1 Create `components/AddCandidateForm.tsx` as a modal/slide-out panel
- [x] 9.2 Add form fields: Name (required), Email (required), Phone, Resume file upload (PDF/DOCX), Source dropdown, Initial Status dropdown, Notes textarea
- [x] 9.3 Add validation: email format, required fields marked with asterisk, resume file type
- [x] 9.4 Add "Cancel" and "Add Candidate" buttons with success/error feedback
- [x] 9.5 Verify form submission creates a new applicant and closes the modal
- [x] 9.6 Handle resume upload: save file to `public/uploads/resumes/`, store path in DB

## 13. Resume Parsing & Filtering

- [x] 13.1 Create `api/resume.ts` with POST `/api/applicants/:id/resume` (upload resume file) and GET `/api/applicants/:id/resume` (get URL)
- [x] 13.2 Extract text from uploaded PDF using `pdf-parse` npm package
- [x] 13.3 Extract text from DOCX using `docx` npm package
- [x] 13.4 Store parsed keywords/skills from resume in applicant record (or separate table)
- [x] 13.5 Add search/filter bar support: filter candidates by resume keywords (e.g., "JavaScript", "React", "management")
- [x] 13.6 Display resume filename with download link in Candidate Detail Modal
- [x] 13.7 Verify resume upload and parsing works end-to-end

## 10. Quick Actions & WhatsApp

- [x] 10.1 Implement hover quick-actions on candidate cards (View, Status, Remind icons)
- [x] 10.2 Implement status dropdown on pencil click
- [x] 10.3 Implement WhatsApp reminder: speech-bubble icon opens wa.me link with pre-filled message
- [x] 10.4 Verify all three actions work from the Kanban board and Jobs Dashboard

## 11. Polish & Empty States

- [x] 11.1 Add empty state to Jobs Dashboard when no jobs exist (SVG + CTA)
- [x] 11.2 Add empty state to Kanban board when no candidates exist (SVG + CTA)
- [x] 11.3 Add empty state to search results when no candidates match (SVG + message)
- [x] 11.4 Verify all empty states render correctly with appropriate illustrations

## 12. Integration & Verification

- [x] 12.1 Run `bun dev` and verify the app starts without errors
- [x] 12.2 Seed the database with `bun run seed` and verify data appears in the UI
- [x] 12.3 Walk through the full user flow: Dashboard → Kanban → Detail → Add → Status change
- [x] 12.4 Verify all API endpoints return correct data by curling them
- [x] 12.5 Verify all wow-factor features work: funnel chart, quick actions, WhatsApp, timeline, empty states
- [x] 12.6 Take screenshots of each page for the demo deck