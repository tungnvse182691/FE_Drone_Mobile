# CODEX-T04 — Crew inbox and project identity review

Date: 2026-10-28 (Asia/Saigon). Baseline: `e288535738f16d969dc09cd41b4924ea877be279`.
Skills: RoadGuard, code-review, requesting-code-review, verification-before-completion.

## Scope and contract evidence

- Read AGENTS, Crew matrix C-02/C-03/C-04, API catalog and Candidate3 controllers/DTO/services/repositories. Backend/Docker unchanged.
- API-037: `GET /me/inspection-tasks`, opaque `cursor`, `limit`, `items/nextCursor/asOf`, assignment filtered to current actor. Corrected old FE API-078 comments.
- API-078: `GET /projects/{projectId}/field-inspection-tasks`, UUID `afterId`, `limit`, project permissions. Added separate read wrapper; inbox uses API-037.
- API-080: project/task detail, assigned actor, server version and actual strong ETag. No manufactured version fallback on this read.
- Evidence sources: `InspectionTasksController`, `InspectionTaskQueryService`, `InspectionTaskReadRepository`, `FieldInspectionWorkflowController`, `FieldInspectionWorkflowRepository.ReadAsync/ViewAsync`, `InspectionTaskResponseDto`, `FieldInspectionWorkflowDtos` and `FieldInspectionWorkflowRepository.CrewRepairContext`.
- Geometry route API supplies route/segment geometry, not an authoritative defect destination. No derived GPS used.

## Files changed

| Files | Change |
|---|---|
| `app/(crew)/tasks.tsx` | Real paginated inbox, session scope, detail identity boundary, loading/empty/error/retry, no mock task registry/fallback. |
| `app/(crew)/home.tsx`, `profile.tsx` | Real loaded assignment counts; explicit count scope; remove fabricated identity/team/task facts. |
| `app/(crew)/wo-detail.tsx` | Owner-scoped real detail; read-only data and explicit unavailable-action reasons. |
| `app/(crew)/navigation.tsx` | Guard missing destination; remove fabricated vehicle location, route line, distance/time/severity claims. |
| `app/(crew)/report-defect.tsx`, `viewfinder.tsx`, `progress.tsx`, `complete.tsx`, `field-review.tsx`, `repair-correction.tsx` | Wrap legacy operations behind valid task/project/session/metadata boundary; remove fallback task/project lookup. Mutation bodies unchanged. |
| `app/(crew)/sync.tsx` | Remove unused task fallback lookup only. Offline processing unchanged. |
| `src/api/crewApi.ts` | Read wrappers, nullable projection, identity/owner/ETag checks, cursor options and operation-ID correction. |
| `src/hooks/useRepairBootstrap.ts` | Require explicit valid task/project IDs and matching server identity/version during bootstrap read only. |
| `tests/t04.test.cjs` | 25 executable regressions using production functions/route defaults/guards and real InfiniteQueryObserver. |
| `tests/t04-http-smoke.cjs` | Opt-in local read smoke with production Axios/interceptors and existing Crew fixtures. Credentials remain in memory. |
| This worklog | Evidence, review and limits. |

All 14 production files belong to original or explicitly expanded allowlist. No eighth additional file. No repair mutation, offline sync, API client, Reporter, Drone or Backend changes.

## Verification

- Initial HEAD/main/origin/main matched baseline; working tree clean before T04 changes. `/ready` 200.
- `npm run typecheck`: exit 0 after final production edits.
- `node --test --test-reporter=spec tests/t01.test.cjs tests/t01-client.test.cjs tests/t01-ui.test.cjs tests/t02.test.cjs tests/t03.test.cjs tests/t04.test.cjs`: **122 PASS, 0 FAIL** (97 unchanged T01–T03 + 25 T04).
- `git diff --check`: exit 0 after removing trailing whitespace.
- Independent reviewer: no P0/P1 within T04 read/identity scope; independently ran T04 tests, 25 PASS. Operational blocking accepted as disclosed scope limitation, not acceptance of command workflows.
- Session tests cover changed actor/session cache keys, signed-out restored user, missing task/project/version, foreign owner, mismatched ETag, nullable GPS, each of six guarded operation routes, and sync without task lookup. Native/offline effects are stubbed, not executed.
- Real Query pagination checks cursor/signal, repeated-cursor termination and new-session cache isolation. HTTP errors remain errors without mock replacement.

### Actual Candidate3 HTTP evidence

`node tests/t04-http-smoke.cjs`: exit 0, 2026-10-28, local port 18081, production Axios/read wrappers; native Platform/crypto adapted for Node.

| Scenario | Observed | Classification |
|---|---|---|
| `/ready` | 200 | HTTP VERIFIED |
| API-037 Crew A | 200; one actual assignment, owner/ID/version validated | HTTP VERIFIED |
| API-037 Crew B | 200; empty assignment list | HTTP VERIFIED |
| API-037 repeated reads | 200 for both actors | HTTP VERIFIED |
| API-037 anonymous | 401 | HTTP VERIFIED |
| API-078 project list | 200 using actual assigned project | HTTP VERIFIED |
| API-078 anonymous | 401 | HTTP VERIFIED |
| API-080 assigned task | 200; task/project/owner/version/strong ETag match | HTTP VERIFIED |
| API-080 anonymous / wrong owner | 401 / 403 | HTTP VERIFIED |
| API-080 operational metadata | No GPS field; repairContext null | BLOCKED for navigation/repair operations |
| Multiple nonempty HTTP cursor pages | Only one assignment in fixture | NOT RUN; cursor contract exercised in regression tests |
| Android E2E | No device/emulator run | NOT RUN |

No task creation, SQL manipulation, password changes or new fixtures. Existing assignment means `BE_FIXTURE_BLOCKED` does not apply to the verified reads. The smoke script's extra-page branch did not execute because there was no next cursor.

## Review / eight invariants

| Invariant | Scoped result |
|---|---|
| MaterialIcons | PASS; no Ionicons in changed production files. |
| UD-06 | PASS; no cost/material quantities introduced. |
| Fabric/navigation | PASS; grouped routes, no RootLayout change; keyed session boundary remounts task UI. |
| Mobile roles | PASS; Crew reads only, no PM/Supervisor substitute. |
| Defect codes | PASS; missing classification stays absent, canonical labels unchanged. |
| Branding | PASS; no fabricated employee prefix/team/person, no new prohibited branding/technology. |
| Contract | PASS; real IDs/version/ETag/cursors; missing GPS stays null; counters label loaded scope. |
| Error handling | PASS within read scope; auth/ownership/read failures hide task data and expose retry/reason. |

Self-healing: compiler errors during initial implementation fixed (imports/projection types); incomplete-task error precedence corrected; noncompleted counters relabeled; trailing whitespace removed. Final compiler/tests/diff checks passed. No optimistic ACK/completion introduced.

## UI status and open limits

| Screen | Status / limit |
|---|---|
| Tasks C-02 | API_CONNECTED / HTTP_VERIFIED data; cursor load more, loading/empty/retry/error; no mock task fallback. Native rendering NOT RUN. |
| Home/Profile | API_CONNECTED to API-037; counts reflect loaded assignments only. Identity uses authenticated store; no new authoritative team statistics API. |
| Detail C-04 | API_CONNECTED / HTTP_VERIFIED read; real status/mode/version/instructions/deadline. Read-only fallback while required operational metadata absent. |
| Navigation C-03 | BLOCKED: authoritative destination absent. No `(0,0)` or route-center substitute. |
| Six dependent operation screens | BLOCKED by real metadata boundary before legacy components/effects mount. No repair workflow acceptance claim. |
| Sync | Task lookup removed; legacy offline logic unchanged and not accepted/tested as a new T04 feature. |

API-080 does not provide WO code, display title, target GPS or defect classification. Raw `NORMAL` mode is preserved and not relabeled `MEASURE_ONLY`. `repairContext` is null in the real fixture: **P5-G02 remains open for repair/bootstrap capability**, no PM/Supervisor endpoint workaround. Accept/reject and other field commands in legacy detail are also unavailable through the read-only fallback; they are not claimed as completed by T04.

Legacy mock field-session/evidence/receiving code remains behind blocked operation components or outside T04. T04 removes inbox/history task fallback; it does not claim all Crew UI or repair chain is free of mocks. Static help/contact copy remains static. No Android UI acceptance and no production-ready claim.

No known new P0/P1 in T04 read/identity scope. Final delivery requires unchanged remote and scoped staged diff; normal commit/push only. No T05.
