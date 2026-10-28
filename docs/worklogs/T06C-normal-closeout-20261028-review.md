# T06C — NORMAL closeout / T06B hardening

## Scope and evidence

- Baseline/main/origin: `e4e67ca97f1a6fe81bbf5e116b7d84395909bd4c`; origin verified and fetched.
- Backend develop: `01cc4725b178199215b02f4ddf7093491a16f2f7`.
- DTO, Execution and FIELD Intake source blobs match local Candidate3. Producing differs only in query indentation at lines 681–689; SubmitAttempt contract is identical.
- `/ready`: HTTP 200. No repair mutations run against shared data.
- Existing untracked `.cache/`, `.setting/`, `logs/`, `mydatabase.db` preserved and excluded.
- Read AGENTS, roadguard/code-review, Crew C-05–C-09, actual DTO/guards/repositories. No Muse report found in worklogs.

## Dependency audit / plan

1. Remove private `CrewWoDetailContent` and its imports/styles: definition only in app/src, no export/caller. Mounted `CrewFieldActions` and exported `NormalRepairBootstrap` stay.
2. Extend allowed journal/workflow/API wrappers: explicit finish follows confirmed server start; immutable version/key/body and receipt reconciliation.
3. Extend existing FIELD draft/capture/review: NORMAL repair claim, real AFTER and exact API-096 lineage. Reject incompatible MEASUREMENT root.
4. Explicit API-157 intake from readback claim and confirmed finish; differentiate intake from PM review. Regression, review and delivery gates.

Dependencies: inbox → detail → FIELD review/camera → FIELD draft → real API; NORMAL detail → bootstrap → repair journal/workflow. Shared camera, auth, SQLite helper, upload transport remain unchanged. Legacy progress/complete/correction routes remain blocked by CrewTaskBoundary; legacy offline queue quarantined by T06A. No additional production file outside approved allowlist required.

Recovery: PREPARED is durable before dispatch; PENDING retains exact replay even after unknown commit; ACKNOWLEDGED reconciles without POST; REJECTED remains terminal and blocks replacement. No journal deletion or invented ACK. Lost server receipts require explicit exact replay because Crew has no dedicated repair receipt GET. No automatic mutation on mount.

## Gate 1

- Legacy removed after reachability search; actual route and mutation semantics preserved.
- 266/266 T01–T06B tests PASS (fresh run); `npm run typecheck` exit 0; diff check PASS.
- Legacy deep links remain fail closed; baseline mount/remount test verifies read only.

## Gates 2–4 — implemented and logic verified

- API-160: explicit finish follows confirmed API-161 receipt; journal saves payload/key/item If-Match before POST. Validate finish/start/task/item/time/sync-clock receipt; API-080 must match before CONFIRMED. Finish keeps item InProgress.
- AFTER: existing camera/upload pipeline reused. NORMAL AFTER requires persisted finish source and explicit user post-repair capture attestation; library AFTER cannot invent capture time. Nullable GPS stays null. Complete upload is not VERIFIED.
- API-095 REPAIR_CLAIM: explicit claim mode preserves real measurements/evidence; requires VERIFIED session and file metadata, AFTER chronology, real first-start. API-096 checks hash, exact evidence/measurements/checklist, repaired=true and root revision 1. ACK recovery rechecks current binding/source. Claim journal is retained for intake.
- API-157: prepares only after confirmed root claim, fresh API-096 and scoped VERIFIED evidence reads, matching finish/current item version. Persisted immutable command; timeout/ACK-write failure replays exact payload/key/version. API-080 reconciles item Submitted. Intake is not PM approval.
- UI: detail exposes explicit finish → AFTER/claim → intake. No mutation on focus/mount. FIELD measurement POST is disabled for NORMAL to avoid creating an incompatible MEASUREMENT root; saving measurements/upload for assessment remains available. Existing non-NORMAL FIELD behavior preserved. Legacy progress/complete/correction remain locked; FastTrack untouched.
- Recovery limitation: REJECTED commands and old-session unresolved journals remain locked for authorized reconciliation; no self-service journal deletion/replacement is offered. Existing MEASUREMENT root cannot satisfy API-157 root contract and remains blocked with a specific message.

## Final verification

- Full test command: `node --test tests/t01.test.cjs tests/t01-ui.test.cjs tests/t01-client.test.cjs tests/t02.test.cjs tests/t03.test.cjs tests/t04.test.cjs tests/t05a.test.cjs tests/t05b.test.cjs tests/t06a.test.cjs tests/t06b.test.cjs tests/t06c.test.cjs`.
- Result: **330 PASS / 0 FAIL / 0 skipped**, exit 0: 266 unchanged baseline tests + 64 T06C tests.
- T06C covers finish before/after-commit timeout, failed ACK persistence, exact replay/restart, stale version/start, 401/403/409/412/428, session switch, root/type/hash/checklist mismatches, missing/old AFTER, VERIFIED/upload reuse, wrong-owner file, binding change at ACK, explicit UI actions, camera attestation/null GPS and locked replacement states.
- TDD evidence: 18 attempt tests first failed because prepareRepairAttempt was missing; all passed after implementing it. UI harness initially needed traversal of camera leftControl to inspect the gallery guard; corrected harness, no production workaround.
- `npm run typecheck`: exit 0, no errors.
- `git diff --check`: exit 0. Secret scan of all 9 delivery files: 0 findings for private keys/JWT/GitHub tokens/signed URL/credential literals. No environment/config/runtime artifacts staged.
- Code-review invariants I01–I08: PASS in changed scope. Repository app/src icon scan: no Ionicons; app cost scan: no matches. Full group routes, stable root Stack untouched; no PM/Supervisor UI, no new defect codes/branding, no fabricated contract values, immutable uncertain outcomes retained.
- Independent reviewer `/root/t06c_review`: read-only diff and Candidate3 contract review, no substantiated new P0/P1/P2 findings; did not independently rerun tests. Primary agent ran verification above. No source edits by reviewer.
- Pre-push fetch: origin URL verified; local HEAD and origin/main still baseline e4e67ca97f1a6fe81bbf5e116b7d84395909bd4c. No remote conflict.

## HTTP evidence / acceptance limits

Read-only smoke `node tests/t05b-http-smoke.cjs`: exit 0, using local handoff credentials only in memory; no credentials or IDs copied to this log.

| API | Evidence | Status |
|---|---|---|
| /ready | 200 | HTTP_VERIFIED |
| 037 / 078 | Crew list/refresh 200, anonymous 401 | HTTP_VERIFIED (available fixture; no multi-page fixture) |
| 080 | Owner 200, strong ETag, wrong-owner 403, anonymous 401 | HTTP_VERIFIED |
| 094 | Owner 200, real first-start; anonymous 401 | HTTP_VERIFIED |
| 096 | Existing owner submission 200 | HTTP_VERIFIED read only; repair claim positive read NOT RUN |
| 085 / 086 | Owner 200, private byte length/SHA-256 match; anonymous 401/wrong-owner 403 | HTTP_VERIFIED read only |
| 160 | Finish implementation and regression | API_CONNECTED / LOGIC_TESTED; HTTP NOT RUN / BE_FIXTURE_BLOCKED |
| 233–236 / 095 repair claim | Capture/upload/claim integration and regression | API_CONNECTED / LOGIC_TESTED; HTTP mutation NOT RUN / BE_FIXTURE_BLOCKED |
| 157 | Root claim intake, receipt and readback regression | API_CONNECTED / LOGIC_TESTED; HTTP NOT RUN / BE_FIXTURE_BLOCKED |

Shared Crew fixture API-080 has repairContext=null; no dedicated safe NORMAL repair fixture available. No shared assignment or repair mutation performed. This is missing fixture evidence, not proof of missing BE implementation. Need a dedicated NORMAL task/binding/item fixture to verify finish → AFTER upload → root claim → attempt over HTTP.

**Android E2E: NOT RUN.** No emulator launched. Device camera/native SQLite and full Android workflow acceptance pending. API-158 PM review, FastTrack, correction and signed offline repair are outside scope and remain unopened.

## Delivery files

Production: app/(crew)/wo-detail.tsx, field-review.tsx, viewfinder.tsx; src/api/crewApi.ts, crewFieldDraft.ts, crewRepairDraft.ts, crewRepairWorkflow.ts. Tests: tests/t06c.test.cjs. Worklog: this file. All belong to T06C allowlist.
