## 1. Assistant Backend

- [x] 1.1 Create `src/api/assistant.ts` with static Indonesian FAQ map (12+ entries: cuti balance, reimbursement, dinas, slip gaji, SOP, surat keterangan + 6 more) and `GET /api/assistant/answer?q=` keyword-hit matcher with graceful fallback and verify curl returns answers + fallback
- [x] 1.2 Add `POST /api/assistant/leave` mock (reference number + in-memory session list) and `GET /api/assistant/requests` and verify curl completes the flyer thread end-to-end
- [x] 1.3 Mount router in `server.ts` and verify no route conflicts via `bun run build`-adjacent probe

## 2. Module Hub Frontend

- [x] 2.1 Create `ModuleHub.tsx` (8 tiles per flyer, Sirius header, live routing for 01/03) and `ComingSoonPanel.tsx` (scope paragraph + "Segera hadir di full build", no fake controls) and verify all tiles render
- [x] 2.2 Rework `App.tsx` entry to hub view (`hub | jobs | assistant` state) keeping jobs flow byte-identical behind tile 03 and verify existing dashboard/kanban/inbox still work
- [x] 2.3 Update header branding to "TalentHub oleh PT. Sirius Global Technologies" and verify poster-to-product continuity

## 3. Assistant Chat Frontend

- [x] 3.1 Create `HrAssistantChat.tsx` (thread UI mirroring flyer screenshot, quick-question chips, Ajukan Cuti action → confirm → reference display) with "(Demo)" labeling and verify the flyer example thread works in browser
- [x] 3.2 Handle fallback + request list display and verify `bun run build` passes

## 4. Integration & Demo Polish

- [x] 4.1 Walk full flow (hub → chat flyer thread → hub → tile 03 → existing pipeline) via `bun dev` and verify end-to-end
- [x] 4.2 Curl assistant endpoints (answer/miss/leave/requests) and verify shapes, then `bun run init-db && bun run seed` to confirm untouched data
- [x] 4.3 Run antislop-ui checklist on hub/chat UI and remove-ai-slops pass on assistant backend and verify build still green
