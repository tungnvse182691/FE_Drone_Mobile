# T06-B — NORMAL assessment and explicit execution start

Date: 2026-10-28 (UTC+7). Scope: NORMAL online API-156/161 only.

## Baseline and authority

- FE main / origin/main before delivery: `14aae8a9e35637470a5de6fcd69f95751902ecf0`.
- Origin verified: `https://github.com/tungnvse182691/FE_Drone_Mobile.git`.
- Latest BE develop checked with GitHub CLI: `01cc4725b178199215b02f4ddf7093491a16f2f7`.
- Local Candidate3 files matched GitHub blob hashes for RepairExecutionController, RepairExecutionService, RepairWorkflowRepository.Execution, FieldInspectionWorkflowRepository.RepairCapture, RepairWorkflowDtos and FieldInspectionWorkflowRepository.CrewRepairContext. Candidate3 is a source snapshot, not a Git checkout.
- AGENTS, roadguard and code-review apply. Backend, Docker, SQL, canonical and demo assignments were not edited.

## Files changed

| File | Change |
|---|---|
| app/(crew)/wo-detail.tsx | Mounted NORMAL section: explicit assessment/start, durable history, replay/reconciliation and reasons for locked capabilities. |
| app/(crew)/field-review.tsx | Minimal actual position checklist input, persisted with FIELD measurements; no invented coordinates or checklist result. |
| src/api/crewApi.ts | Capability guards for assessment/start; API-156/161 require actual strong response item ETag. |
| src/api/crewRepairDraft.ts | Immutable journal history and transactional phase transitions; assessment-to-start dependency and old-session isolation. |
| src/api/crewRepairWorkflow.ts | New dispatcher, validation, verified evidence checks, first-start lookup and receipt reconciliation. |
| tests/t06b.test.cjs | 50 executable regression cases using real production modules and real SQLite in memory. |
| This worklog | Evidence and limitations. |

Dependency review covered inbox/boundary/detail, FIELD measurement/capture/upload drafts, bootstrap, journal, API wrappers, receiving/mock/offline entrypoints and legacy execution routes. Existing boundary session keys remount task content on identity change. Legacy repair screens and dispatch paths remain locked; no extra production file was needed.

## Command and receipt behavior

- Read NORMAL context from owner-scoped API-080; first-start identity is checked against API-094 and assignment. RepairItem version is independent of task ETag.
- Assessment snapshots only the same actor/session/environment/task FIELD draft. Recheck upload session and file VERIFIED, ID, checksum, media type and size; omit AFTER without relabeling it. Backend remains the authority for purpose/ownership/readiness.
- Nullable deviceId is sent as null; origin/key are client command identities, never server effect IDs. Start uses the actual assessment receipt ID and original first-start ID.
- SQLite saves the complete immutable command before POST. PREPARED -> PENDING -> ACKNOWLEDGED -> CONFIRMED; explicit rejection retains the original command. Unknown transport outcome, malformed receipt or failed ACK persistence retains PENDING. No success is inferred from a timeout.
- Explicit replay preserves body, key, origin, If-Match and identity. ACK reconciliation does not POST again. Double dispatch is locked. Changed session/binding/assignment stops use of prior results; unresolved old-session commands block replacement.
- INCOMPLETE is a confirmed assessment result, not permission to start. Corrected assessments retain history. Start requires latest confirmed READY assessment and matching current itemVersion.
- API-080 is context/version reconciliation, not an assessment receipt read endpoint. Success requires an actual validated POST receipt plus matching item context/status. There is no Crew-authorized dedicated assessment/start receipt GET in this implementation. Lost POST responses require exact idempotent replay; changed binding or a later version fails closed for manual reconciliation.
- History restoration validates receipt shape and current binding. Confirmed start additionally requires matching InProgress item version. No POST runs on mount/remount or navigation.

## Verification

| Gate | Result |
|---|---|
| TypeScript | `npm run typecheck`: exit 0. |
| Full regression | `node --test tests/t01.test.cjs tests/t01-ui.test.cjs tests/t01-client.test.cjs tests/t02.test.cjs tests/t03.test.cjs tests/t04.test.cjs tests/t05a.test.cjs tests/t05b.test.cjs tests/t06a.test.cjs tests/t06b.test.cjs`: 266 PASS, 0 FAIL, 0 skipped (216 existing + 50 T06B). |
| New regression coverage | Invalid context/actor/assignment/first-start/version; nullable device; timestamp normalization; VERIFIED/checksum/AFTER; READY/INCOMPLETE; server IDs and ETag; journal before POST; restart/exact replay; ACK storage failure; reconciliation; session switch; concurrent dispatch; 401/403/409/412/428; missing receipt; mount/remount without mutation. |
| Independent review | Existing t06b_review agent re-reviewed latest delta: no P0/P1, independently ran 50/50 T06B tests. Earlier summary reports no remaining P2. |
| Diff / scope / secrets | Final staged diff checked before commit; only the seven paths above included. No credentials, signed URL, env file or account dump included. |
| Android E2E | NOT RUN. Native SQLite lifecycle and rendered UI acceptance remain pending; no emulator launched. |

Eight scoped invariants: MaterialIcons, UD-06, Fabric/group routing, mobile role scope, defect vocabulary, branding, contract data and error handling reviewed. No new forbidden icons, cost UI, role screens, defect codes or fabricated data. RootLayout unchanged. Error paths retain immutable commands and do not show optimistic repair success.

Review fixes verified by new tests include missing/weak item ETag rejection, timestamp normalization and confirmed receipt restoration against current binding/context. No known P0/P1 remains in implemented scope.

## Safe HTTP smoke

Command: `node tests/t05b-http-smoke.cjs`, exit 0. Credentials were read in memory from the existing local handoff, never printed or committed. Only login/read was performed; no repair or assignment mutation.

| Endpoint | Evidence |
|---|---|
| /ready | 200 |
| API-037 | 200; Crew A one assignment, Crew B empty; refresh 200, anonymous 401. |
| API-078 | 200; anonymous 401. |
| API-080 | 200; actual owner, version and strong task ETag; anonymous 401, wrong owner 403; repairContext null. |
| API-094 | 200, actual first-start ID; anonymous 401. |
| API-096 | Owner read 200. |
| API-085/086 | 200; private bytes size and SHA-256 matched metadata; anonymous 401, wrong owner 403. |
| API-156 / API-161 | API_CONNECTED / LOGIC_TESTED / BE_FIXTURE_BLOCKED. Mutation HTTP NOT RUN: no dedicated authorized NORMAL binding fixture available. Not HTTP_VERIFIED. |

## Remaining gates and locked functions

- Positive NORMAL workflow requires an independent fixture with valid binding, RepairItem, active assignment/membership, first-start and VERIFIED evidence. Current repairContext null is fixture evidence, not proof that BE lacks the business operation (P5-G02 positive evidence pending).
- Available shared fixture keeps assessment/start locked because NORMAL context is absent. Missing draft evidence/measurements, invalid identity/version and unresolved commands also lock the relevant operation with a reason.
- FastTrack remains outside T06B; eligibility/policy/authorization and a dedicated fixture are unverified. No NORMAL context is inferred for FastTrack.
- Progress, complete and repair-correction legacy routes remain locked. Finish API-160, attempt API-157, supplement API-159 and signed offline repair are not implemented here.
- Existing untracked `.cache/`, `.setting/`, `logs/` MCP artifacts and empty `mydatabase.db` are unrelated to T06B. Preserved outside the commit; no claim that the entire working tree is clean.

Delivery classification: T06B API integration and logic tests verified; NORMAL mutation HTTP and Android acceptance pending. Stop at T06B.
