# T06-D/E — correction and FastTrack: safe blocked capabilities

## Scope / preflight

- FE baseline HEAD and fetched origin/main: `ae8ffab18c1ff88dbd1002e0fb37b63b8e3f762c`.
- Origin: `https://github.com/tungnvse182691/FE_Drone_Mobile.git`.
- Tracked tree initially clean. Unrelated untracked `.cache/`, `.setting/`, `logs/`, `mydatabase.db` preserved and excluded.
- Authoritative BE develop checked via GitHub CLI: `01cc4725b178199215b02f4ddf7093491a16f2f7`.
- Candidate3 read only. `/ready`: HTTP 200. No repair/FIELD mutation, shared assignment change, SQL, Docker configuration change, Android emulator, or dependency installation.
- Read AGENTS, roadguard/code-review, Crew C-05–C-09 matrix, NORMAL/FastTrack workflows, T05B/T06A/T06B/T06C worklogs. No separate Muse source audit located in those worklogs.
- User permits committing a completed safe blocked capability when Crew read sources are absent. This delivery does **not** implement revision/API-159 or FastTrack execution.

## Dependency audit / exact allowlist before edits

The table was presented before any production edit. Routes and transitive callbacks audited: inbox → owner-scoped task detail → FIELD measurement/camera → durable FIELD draft → upload → API-095/096; detail → NORMAL bootstrap → immutable repair journal → repair workflow. Correction legacy callbacks were examined before removal.

| Dependency | Decision / reason |
|---|---|
| `app/(crew)/repair-correction.tsx` | EDIT: remove legacy submission selection and direct supplement callback; replace with owner/session guarded read-only blocked screen |
| `app/(crew)/wo-detail.tsx` | EDIT: link to guarded correction inspection; separate FastTrack blocked explanation from NORMAL; mount NORMAL bootstrap only for actual NORMAL mode |
| `app/(crew)/tasks.tsx` | READ ONLY: reuse `CrewTaskBoundary operational=false`, API-080 owner/version validation, actor/session query key and error/retry UI; default operational legacy guard retained |
| `app/(crew)/_layout.tsx` | READ ONLY: existing correction route/tab already registered; no routing configuration change required |
| `app/(crew)/field-review.tsx`, `viewfinder.tsx` → shared ViewFinder | READ ONLY: existing FIELD capture/review and NORMAL claim stay intact; no correction revision or legacy progress/complete navigation added |
| `src/api/crewFieldDraft.ts` → SQLite/file system/upload/client | READ ONLY: retained root claim, VERIFIED metadata checks, immutable submission intent and readback; do not overwrite prior draft/receipt for correction |
| `src/hooks/useRepairBootstrap.ts` → crewApi/auth/mock/tasks | READ ONLY: guarded API-080 NORMAL bootstrap; legacy repair transport locked; mock receiving/list compatibility stays unreachable from new correction UI |
| `src/api/crewRepairWorkflow.ts`, `crewRepairDraft.ts` → SQLite/auth/API-080/094/096/evidence | READ ONLY: preserve T06B/C journal and rejection/unknown-outcome rules; no new command or journal schema |
| `src/api/crewApi.ts` → shared API client/problem parser | READ ONLY: existing real wrappers unchanged; do not use eligibility ETag as item If-Match |
| legacy progress/complete/correction callbacks, sync/receiving/mock queue | Correction callback removed; others READ ONLY and kept blocked/quarantined; no receiving/offline implementation |
| tests/worklog T06DE | ADD: executed component/guard regressions, source evidence, limitations and BE requests |

No production file outside allowlist needed. No new workflow module with speculative DTOs or unused mutation paths.

## Source / permission proof

Candidate3 blob hashes match develop for:

- `RoadGuardSystem.DTOs/Inspections/FieldInspectionWorkflowDtos.cs`
- `RoadGuardSystem.Repositories/Implementations/Inspections/FieldInspectionWorkflowRepository.cs`
- `.../Inspections/FieldInspectionWorkflowRepository.CrewRepairContext.cs`
- `.../Repairs/RepairEligibilityRepository.cs`
- `.../Repairs/RepairFtEligibility.cs`

`RepairWorkflowRepository.Producing.cs` differs in formatting; comparison of full contents with whitespace removed is equal. Source evidence is not HTTP execution evidence.

### D: PM review / revision lineage

| Source | What it proves / what is absent |
|---|---|
| API-080 / `FieldInspectionWorkflowDtos.cs:138–158` | NORMAL context has package/item/binding/mode/status/itemVersion/plan/checklist. Submission view has root/parent/revision/hash/evidence. Neither returns current attempt/intake/PM repair review/reason/next revision |
| API-088 / `FieldInspectionWorkflowRepository.cs:201–205` | Assignments and FIELD task events only. It is not repair-review history. PM repair review producer writes `FieldInspectionReview`, `RepairAttemptReview`, business request and repair lifecycle event, not a current review projection in this response |
| API-096 | Can prove a known submission's root/parent/revision/hash, not that PM requested correction for the current intake or that this is the current accepted lineage |
| API-158 / Producing.cs:100 onward | PM-only POST review. Not a Crew read or command |
| API-159 / Producing.cs:266–337 | Crew command requires actual item version, Submitted item, current attempt/intake/review; Decision SUPPLEMENT tied to current intake. New FIELD submission must match actor/task/assignment/formal root, parent=previous, revision+1, first-start/hash, latest revision. No client inference from task status |
| API-141/148 / RepairWorkflowRepository.cs:205 onward | Guard allows PM/Supervisor only. Not a Crew fallback |

**BE_CONTRACT_GAP D:** no established Crew read projection joining current PM repair review to current attempt/intake and effective FIELD lineage. A task `SupplementRequired`, `Submitted`, or local `AWAITING_PM_REVIEW` is insufficient.

Minimum BE addition to request (proposed contract, **not implemented/assumed**): owner-scoped Crew read in a serializable snapshot with project/task/assignment/original actor, package/item/binding and actual itemVersion; current attempt/intake IDs, PM review ID/decision/reason and reviewed submission/hash; formal root, effective latest submission/parent/revision, original first-start, expected next revision and no-newer-revision fact. Absent/reassigned/superseded/revoked states must fail closed. API-159 still revalidates transactionally.

No positive PM decision or correction lineage proof exists over HTTP in this delivery. No revision prepared, no API-095 repair correction, no API-159, no replacement idempotency key, no journal write. Tests of revision/API-159 mutation/replay/HTTP rejection handling are **NOT RUN for D**, because that capability is deliberately unopened; prior T05B FIELD supplement and T06B/C journal tests remain regression evidence only.

### E: FastTrack bootstrap / policy / itemVersion

| Source | Admission / limitation |
|---|---|
| API-080 / CrewRepairContext.cs:17–50 | Requires Crew, actual current NORMAL RepairItem, correct binding/task/assignment/membership. Returns null for task mode other than NORMAL, including CONDITIONAL_FT |
| API-037/078/080 FIELD task view | project/task/assignment/first-start available; no FastTrack package/item/binding/itemVersion bootstrap |
| API-146 / RepairEligibilityController.cs + RepairEligibilityRepository.cs:15–67 | Crew allowed with current membership, matching item/binding/task/assignment; requires known package/item IDs. Version is `h4-eligibility-v1-` plus representation SHA-256, not RepairItem RowVersion |
| RepairEligibilityReadDtos.cs | Policy revision/hash/rules/state, assessment/measurements, original verified start/window, source mapping/coverage/missingReasons available after valid IDs. Does not supply itemVersion or independently bootstrap the task binding |
| RepairFtEligibility.cs + RepairWorkflowRepository.Execution.cs | Requires CONDITIONAL_FT task/current actor/active assignment, coverage, pinned non-revoked policy, real pre-execution assessment/location/measurements, first-start authorization/window and observed stop conditions. Server rechecks on execution; eligible=true alone is insufficient |
| API-141/148 | PM/Supervisor-only, not an itemVersion workaround |

**BE_CONTRACT_GAP E:** missing Crew FastTrack bootstrap for actual package/item/binding/assignment/mode/itemVersion. Do not adapt NORMAL context, accept route-supplied IDs, use task ETag or use eligibility ETag for mutations.

Minimum BE addition to request (proposed only): owner-scoped Crew CONDITIONAL_FT bootstrap, project/task/assignment/item/package/binding, actual RepairItem rowversion and current state, real first-start and authorization/policy/coverage source pins, server window and authoritative stop-condition definitions/read path. Distinguish representation version from mutation If-Match. API-146 can then be queried with server-derived IDs. Online admission and signed offline registry remain separate.

No legitimate FastTrack IDs are available from current Crew read sources; therefore no speculative API-146 call and no FastTrack assessment/start/finish/claim/attempt. Eligibility positive/negative/window/policy mutation scenarios are **NOT RUN** for the new capability, not reported as HTTP VERIFIED.

## Implementation / mini plan completed

1. Remove unsafe legacy correction renderer/callbacks. No mock submission selection, status-derived trigger, recursive new-key conflict retry or immediate synthetic done UI remains on the route.
2. Reuse existing real read boundary, independent of GPS/WO. It provides loading/error/retry/401/403/404 behavior and session isolation. The route displays only actual task identity/status plus explicit missing-source explanation; sending is disabled with no mutation handler.
3. Task detail offers read-only correction inspection preserving project/task. FastTrack has its own blocked explanation and disabled action. Only NORMAL mounts the NORMAL command component; no progress/complete navigation added.
4. Keep all FIELD root/receipt/journal data unchanged. ACK remains distinct from PM approval. No shared auth/client/BE changes.

## Verification

- New tests execute actual TSX components and existing production boundary using controlled native/query ports. They are not Android rendering tests. Covers real read boundary, null GPS/missing WO, PM-proof absence across four states, disabled no-op actions, exact navigation identity, no task/project/token, wrong role, actor/session ownership validation, FT null/NORMAL/malformed eligibility-like context, and separation from NORMAL.
- TDD: first run 12 failed / 4 passed, including missing read-only exports and old operational guard. Corrected test harness expectation to actual validation error `crew_identity_invalid`; no production workaround.
- Full regression: **346 PASS / 0 FAIL / 0 skipped** = 330 unchanged baseline + 16 T06DE tests. Command: `node --test tests/t01.test.cjs tests/t01-ui.test.cjs tests/t01-client.test.cjs tests/t02.test.cjs tests/t03.test.cjs tests/t04.test.cjs tests/t05a.test.cjs tests/t05b.test.cjs tests/t06a.test.cjs tests/t06b.test.cjs tests/t06c.test.cjs tests/t06de.test.cjs`.
- `npm run typecheck`: exit 0, no diagnostics (explicit `TYPECHECK_EXIT=0` verified).
- `git diff --check`: exit 0. LF/CRLF conversion notices are Git configuration notices, not whitespace errors.
- Repo app/src icon scan: no Ionicons. App cost/UD-06 scan: no matches. Other review invariants checked in diff: full group routes, root Stack untouched, Crew only, no defect/brand changes, no invented contract data, no ambiguous mutation success.
- Independent reviewer `/root/t06de_review`: no P0/P1/P2 findings in two production files and new tests; independently ran 16/16 new tests, `npx tsc --noEmit` exit 0 and diff check exit 0. Verified latest develop SHA/NORMAL-only source and correction/FT read gaps. No source edits. Full regression/HTTP smoke/worklog gates run by primary agent.
- Delivery secret scan of all four files: 0 findings for private keys, JWTs, GitHub tokens, signed storage credentials/signatures, or credential literals. No config/environment/runtime artifacts included. Pre-commit fetch confirmed origin URL, branch main and HEAD=origin/main at baseline; no remote advancement/conflict.
- Review conclusion: no new identified P0/P1/P2 in the delivered read-only/blocked scope; I01–I08 pass. BE gaps remain open and prevent mutation acceptance. D/E safe capabilities delivered together; no claim of completed repair correction/FastTrack workflow.

## HTTP evidence / acceptance matrix

Read-only `node tests/t05b-http-smoke.cjs`: exit 0. Uses handoff credentials in memory only. No IDs, tokens, passwords or signed URLs copied here.

| API/capability | Status / evidence |
|---|---|
| /ready | HTTP_VERIFIED 200 |
| 037/078 | HTTP_VERIFIED owner list/refresh 200, anonymous 401; one-page available fixture only |
| 080 | HTTP_VERIFIED owner 200 + strong ETag; anonymous 401; wrong owner 403; current fixture repairContext=null |
| 094 | HTTP_VERIFIED owner 200 with real origin, anonymous 401 |
| 096 | HTTP_VERIFIED existing FIELD submission 200; correction lineage positive NOT RUN |
| 085/086 | HTTP_VERIFIED owner 200, bytes length/checksum, anonymous 401/wrong owner 403 |
| 088 | Source/permission AUDITED; runtime NOT RUN |
| 095 revision / 159 correction | BE_CONTRACT_GAP; mutation NOT RUN; safe blocked UI LOGIC_TESTED |
| 158 PM review | External PM-only POST, not called; NOT RUN |
| 146 eligibility | Existing wrapper API_CONNECTED; Crew source bootstrap BE_CONTRACT_GAP; HTTP NOT RUN |
| 156/161/160/157 FastTrack | BE_CONTRACT_GAP; NOT RUN; no speculative mutation implementation |
| NORMAL positive repair workflow | Existing T06B/C logic regressions PASS; HTTP BE_FIXTURE_BLOCKED (no dedicated safe assignment/item fixture) |

Contract gaps above are source-verified and distinct from missing runtime fixtures. A new fixture alone does not add the missing Crew read projection. **Android E2E: NOT RUN.** No emulator launched. Native camera, SQLite and full device acceptance remain pending.

## Locked UI / next work

- Correction revision/submission/API-159 locked until actual PM/current-intake read source exists.
- FastTrack eligibility and all repair mutations locked until Crew bootstrap exists; eligible=true alone cannot unlock.
- Legacy progress/complete remain locked. No Receiving/C-11, Offline Sync/C-10, T08/T09 work started.
- Before subsequent phases: BE must deliver the two read contracts, then dedicated safe NORMAL correction and CONDITIONAL_FT fixtures via valid workflow, mutation/readback tests with actual itemVersion, journal crash/replay/concurrency/evidence tests and separately approved Android gates. No direct SQL/demo changes.
