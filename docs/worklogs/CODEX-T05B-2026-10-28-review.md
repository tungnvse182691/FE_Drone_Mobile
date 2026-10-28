# CODEX-T05B — Crew evidence / FIELD integration

## Scope and preflight

- Baseline/main/origin: `552671eb149eb6e0b5e1056926bc4a4f51fa1502`; clean before implementation. Origin checked and fetched again before delivery; no remote advancement at that check.
- Candidate3 read only; `/ready` HTTP 200. No Backend, Docker, SQL, assignment or shared demo mutation performed.
- Read AGENTS, roadguard/code-review skills, Crew C-05/C-06/C-07 matrix, API catalog and Candidate3 upload / FIELD controller, DTO, service and repository implementations. Source routes and permissions govern execution.
- Dependency audit: inbox → owner-scoped detail → FIELD review/capture → durable photo → upload → submission/readback. Legacy repair screens remain behind their existing operational boundary. No additional production file outside the consolidated allowlist was required.

## Implementation

- FIELD capability checks require actual Crew identity, assignment, project/task, strong rowversion ETag, first-start record and allowed server status. Missing GPS/WO/defect/repairContext does not block independent FIELD capabilities. Repair execution remains unavailable.
- Detail opens FIELD review after fresh task and start-origin reads. Capture confirmation, including AFTER, opens FIELD review, never legacy repair complete/progress. AFTER requires PostRepair.
- GPS denial never calls position acquisition. Exceptions, service failure, timeout and unmount produce null or suppress callbacks. Camera remains independent of GPS; camera failure and overlapping capture are handled.
- Actual JPEG/PNG bytes are copied to durable app storage through temp/hash/rename before SQLite metadata. Library media receives no invented camera GPS/time. No mock inspection session is used by the FIELD screens.
- New `crewFieldDraft.ts` partitions by environment/actor/task and checks original server session identity around every asynchronous operation. Corrupt storage fails closed. Old-session drafts are retained and blocked for reconciliation rather than silently replaced.
- Upload intent, part URL intent and completion body/key/version are persisted before POST. Transport ambiguity preserves them. Definitive URL issuance 409 archives only that renewable capability intent, verifies the same UPLOADING session/file and persists its replacement for explicit retry. File/create/complete identities are unchanged. Signed URLs are neither rewritten nor persisted.
- Success requires upload VERIFIED plus matching actual file metadata/checksum/size/type. Upload complete alone is insufficient.
- Initial and supplement API-095 use actual first-start, fresh assignment/version, actual latest parent, validated evidence and measurements. Immutable payload/key/If-Match are stored before POST. Timeout or ambiguous 409 keeps pending; explicit replay uses the original command. ACK without GET readback remains acknowledged. GET-096 and evidence readback precede confirmation. No generated server submission ID/content hash.
- API-085/086 use authenticated requests and download bytes to a private local preview after checksum/length validation.
- New-defect report UI no longer enqueues a synthetic FIELD command. Its unsupported send action is disabled with a reason and navigation to task FIELD review.

## Verification

| Gate | Evidence |
|---|---|
| TypeScript | `npm run typecheck`: exit 0 |
| Existing T01–T05A | 149 PASS, 0 FAIL |
| New T05B | 33 PASS, 0 FAIL |
| Combined logic suite | 182 PASS, 0 FAIL; actual TS modules transpiled into VM with native/storage/API ports controlled by tests |
| Diff | `git diff --check`: exit 0 |
| Independent review | Read-only contract/diff reviewer: no remaining identified P0/P1; corrupt-journal issue fixed and expired URL recovery reviewed |
| Android E2E | NOT RUN; no emulator/device launched |

New tests cover null GPS/missing WO, assignment/origin/status guards, denied/service-off/exception/timeout/unmount GPS, real hash/multipart/VERIFIED metadata checks, durable URL/completion/submission intent, initial and supplement lineage, 401/403/409/412, session switch, restart replay, corrupt JSON, failed/mismatched GET, and actual detail/capture navigation handlers. Native camera/SQLite are not executed by these logic tests.

HTTP command: `node tests/t05b-http-smoke.cjs` (read only; credentials held only in memory, never printed or committed).

| API | HTTP evidence / status |
|---|---|
| API-037 / 078 / 080 | 200 owner reads; Crew inbox 1 assigned / other Crew 0; refresh read; anonymous 401; wrong-owner detail 403 |
| API-094 | 200 actual first-start record; anonymous 401 |
| API-085 | HTTP_VERIFIED: 200, VERIFIED metadata; anonymous 401; wrong-owner 403 |
| API-086 | HTTP_VERIFIED: 200 private bytes; actual SHA-256 and size match metadata; anonymous 401; wrong-owner 403 |
| API-096 | HTTP_VERIFIED: 200 existing task submission readback. Post-mutation readback is NOT RUN |
| API-233 / 235 / 236 / 095 | API_CONNECTED; HTTP mutation NOT RUN / BE_FIXTURE_BLOCKED: no dedicated safe Crew fixture |
| API-234 | API_CONNECTED; positive session workflow HTTP NOT RUN without a dedicated upload fixture |

## UI / API / workflow acceptance

| Screen | UI / integration | Remaining acceptance |
|---|---|---|
| Inbox / task boundary | Owner/session read boundary retained; explicit FIELD boundary accepts nullable presentation data | Android NOT RUN |
| Task detail | FIELD entry wired with fresh status/version/origin checks; navigation GPS remains gated | Native navigation NOT RUN |
| Capture | Camera/library → durable FIELD draft; nullable real GPS; AFTER → FIELD review | Native permissions/media/storage NOT RUN |
| FIELD review | Loading/error/retry, measurements, draft save, upload VERIFIED, initial/supplement, stable replay, private preview, GET-confirmed result | Full mutation workflow BE_FIXTURE_BLOCKED; Android NOT RUN |
| New defect report | Unsupported synthetic send removed; action disabled with explanation | New-defect API not implemented/verified in T05B |

## Open limitations / blockers

- No identified open P0/P1 in the implemented scope; this is not a production-readiness or Android acceptance claim.
- No dedicated safe mutation fixture: upload and FIELD initial/supplement positive HTTP chain remains BE_FIXTURE_BLOCKED. Existing shared assignment/evidence was only read.
- Candidate3 can accept an INCOMPLETE submission; actual device GPS alone does not supply authoritative GPS source binding. Server readiness/missingReasons remain authoritative; the app does not claim READY or repair completion.
- Old-session or corrupt local journals deliberately block editing/replay. Cross-session recovery requires reconciliation; no automatic migration/deletion is provided.
- Unknown submission 409 retains the exact pending command; user must reconcile before a new payload. No synthetic success or new command is generated to bypass the conflict.
- Repair execution / fast-track / legacy offline repair workflows are outside T05B; repairContext null never opens them.

## Changed files

Eight allowed production files: `app/(crew)/tasks.tsx`, `wo-detail.tsx`, `viewfinder.tsx`, `field-review.tsx`, `report-defect.tsx`, `src/api/crewApi.ts`, `src/api/crewFieldDraft.ts`, `src/components/ViewFinder.tsx`.

Tests: `tests/t05b.test.cjs`, `tests/t05b-http-smoke.cjs`. This worklog records review/fixes and delivery limits. No T06 work.
