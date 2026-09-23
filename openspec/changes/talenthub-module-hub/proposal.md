## Why

The Sirius flyer sells an 8-module AI HR platform, but TalentHub demos only Talent Intelligence — a client walking from poster to product immediately asks where the other seven modules are. A module hub turns that gap into the sales narrative (this is the platform, today we go deep on module 03), and a working HR assistant chat delivers the poster's own hero example (leave-balance Q&A) as the second live module.

## What Changes

- **Module hub landing** — 8 tiles matching the flyer (AI HR Assistant, Company Brain, Talent Intelligence, Project Staffing, HR Operations, Performance & Development, Workforce Intelligence, Management Command Center); tile 03 enters the existing app, tile 01 enters the chat, tiles 02/04–08 open honest "Segera hadir di full build" panels describing each module's planned scope.
- **HR assistant chat (01-lite)** — Rule-based chat panel seeded with 12+ canned Indonesian Q&A (saldo cuti, reimbursement, prosedur dinas, slip gaji, SOP access) plus a leave-request mock flow mirroring the flyer screenshot ("Berapa sisa cuti saya tahun ini?" → balance answer → "Ajukan Cuti" action); unmatched questions get a graceful fallback suggesting HR contact.
- **Sirius branding alignment** — Header/footer carry PT. Sirius Global Technologies identity alongside TalentHub so poster and product read as one company.

## Capabilities

### New Capabilities

- `hr/module-hub`: 8-tile launcher with live/coming-soon routing matching the flyer module list.
- `hr/hr-assistant`: Rule-based HR FAQ chat with leave-balance answers and a mocked leave-request action.

### Modified Capabilities

_(none — hub wraps existing screens; no current behavior changes)_

## Impact

- Front-end: `App.tsx` (hub as entry view), new `ModuleHub.tsx` + `ComingSoonPanel.tsx` + `HrAssistantChat.tsx` components; header branding update.
- Back-end: new `src/api/assistant.ts` router serving canned Q&A matching (`GET /api/assistant/answer?q=`) and mock leave request (`POST /api/assistant/leave`); seeded FAQ rows or static map (static map preferred — no migration).
- No new dependencies; no auth; same mock honesty ((Demo) labels, canned answers). Workforce analytics stays out — follow-up change.
