# FINAL Drone API closure — 2026-10-28

- Reviewer: Codex Drone subagent; mode `IMPLEMENT_AND_SELF_REVIEW` (not independent review).
- FE baseline: `1ed634640c23661e269c0c4c4c68253edd5da005`, branch `main`.
- BE authority pin supplied by parent: `01cc4725b178199215b02f4ddf7093491a16f2f7` develop. Candidate3 extracted checkout has no `.git`; direct local `git rev-parse` cannot verify this pin. Parent owns remote/pin preflight. BE files read only.
- Scope: Drone screens/API, new Drone readback component/workflow/tests; no shared client/auth/upload, config or BE changes; no stage/commit/push.

## Findings and changes

1. Reproduced seeded-device production submission. Upload screen previously uploaded bytes before dataset POST with `FIXTURE_DRONE_DEVICE_ID`; retries used regenerated timestamp/changed version and cleared keys after most failures. Removed fixture constant and mounted upload/dataset transport. Picker/layout remains, submission disabled with explicit reason before any network request. Removed sample task/device/GPS configuration and task chooser; server task navigation remains. Device source is a `BE_DISCOVERY_GAP`; immutable durable upload/dataset retry is an FE remaining dependency. Do not mistake a user-entered device UUID for discovery/assignment proof.
2. API-227 accept cleared command keys on all errors, including unknown outcome. API-230 decline could reuse a key with changed reason/version. Both production actions now disabled with adjacent durable-command explanation. Read-only task/work-package screens remain. Underlying wrappers remain dormant, not counted as mounted write closure. No new persistent journal invented.
3. Added source-backed API-026 DatasetDetailView and API-025 coverage wrappers. Mounted explicit read in Drone Log through `DroneDatasetReadbackPanel`. Workflow validates current role/session/environment, dataset identity/submitter/project/task, strong version/ETag, task owner and pinned route/segment/band scope, coverage scope and final unchanged dataset version across awaits. Coverage UNKNOWN remains UNKNOWN; file VERIFIED never becomes coverage PASS. Bounded UI preview (20 scope rows). No automatic GET or POST on panel mount.
4. Existing Drone Sync remains local read only, no legacy batch POST, no Crew signing; no fabricated flight history restored.

## Source contract evidence

All paths below relative to Candidate3 `RoadGuardBackend`:

- `RoadGuardSystem.API/Controllers/SurveyV2Controller.cs:97`: API-026 authorized GET datasets/{id}; shared ReadResource maps ETag and 401/403/404.
- `.../SurveyV2Controller.cs:148`: API-025 coverage GET and 401/403/404/422.
- `RoadGuardSystem.Services/Implementations/Surveys/SurveyV2Service.cs:147`: coverage allows Operator/PM/Supervisor, Operator must own dataset and be in project scope; assessment dimensions/UNKNOWN preserved.
- `.../SurveyV2Service.cs:234`: DatasetDetailView read guard, submittedBy and source scope/file/pair projection (not DatasetResponseDto).
- `.../SurveyV2Service.cs:111`: submission requires DroneOperator, nonempty DeviceId, current active task assignment/project, wire scope and file pairing.
- `RoadGuardSystem.Repositories/Implementations/Surveys/SurveyV2PersistenceService.Dataset.cs:60`: DeviceId must exist with DroneDeviceStatus.Active. No Operator device read/discovery endpoint found in controller inventory. Seeds are historical fixtures, not runtime authority.
- `RoadGuardSystem.DTOs/Surveys/AssessmentDtos.cs:23`: DatasetDetailView wire shape; `DatasetCoverageResponseDto.cs`, `DatasetCoverageItemDto.cs`: coverage shape.

## Unique Drone inventory (no duplicate screen usages)

All rows use role `DRONE_OPERATOR`; API base `/api/v1`. Wrapper names are in `src/api/droneApi.ts`. Status is current reachability/evidence, not blanket acceptance.

| ID | Method/path | Wrapper | Mounted caller | Evidence/open dependency |
|---|---|---|---|---|
| API-025 | GET /datasets/{datasetId}/coverage | getOperatorDatasetCoverageReal | log → DroneDatasetReadbackPanel → readOperatorDatasetReadback | API_CONNECTED/LOGIC_TESTED; HTTP401/404 verified only; positive fixture blocked |
| API-026 | GET /datasets/{id} | getOperatorDatasetReal | log → DroneDatasetReadbackPanel → readOperatorDatasetReadback | API_CONNECTED/LOGIC_TESTED; HTTP401/404 verified only; positive fixture blocked |
| API-029 | GET /files/{fileId} | getOperatorFileMetadataReal | none after upload gate | dormant wrapper; positive NOT_RUN |
| API-038 | GET /me/survey-tasks | listOperatorSurveyTasksReal | home, requests | HTTP read200, 6 task details reached across two fixture accounts |
| API-104 | GET /projects/{projectId}/geometry-package | getOperatorGeometryPackageReal | work-package | API_CONNECTED, current positive HTTP NOT_RUN |
| API-225 | GET /survey-tasks/{taskId}/work-package | getOperatorWorkPackageReal | work-package, request-detail, request-decline | API_CONNECTED, current positive HTTP NOT_RUN |
| API-226 | GET /survey-tasks/{taskId} | getOperatorSurveyTaskDetailReal | request-detail, request-decline, log, dataset readback | HTTP read200 six details, wrong Operator403, anonymous401 |
| API-227 | POST /survey-tasks/{taskId}/accept | acceptOperatorSurveyTaskReal | none; UI fail closed | FE durable immutable command/recovery missing; mutation NOT_RUN |
| API-229 | POST /survey-tasks/{taskId}/datasets | submitOperatorDatasetReal | none; UI fail closed | device discovery + durable command + BE_FIXTURE_BLOCKED; mutation NOT_RUN |
| API-230 | POST /survey-tasks/{taskId}/decline | declineOperatorSurveyTaskReal | none; UI fail closed | FE durable immutable command/recovery missing; mutation NOT_RUN |
| API-233 | POST /uploads | createOperatorUploadSessionReal | none; UI fail closed | BE_FIXTURE_BLOCKED + immutable upload resume missing; NOT_RUN |
| API-234 | GET /uploads/{uploadId} | getOperatorUploadSessionReal | log (explicit GET) | API_CONNECTED; anonymous401; positive session fixture NOT_RUN |
| API-235 | POST /uploads/{uploadId}/complete | completeOperatorUploadReal | none; UI fail closed | BE_FIXTURE_BLOCKED; NOT_RUN |
| API-236 | POST /uploads/{uploadId}/part-urls | getOperatorUploadPartUrlsReal | none; UI fail closed | BE_FIXTURE_BLOCKED; NOT_RUN |

14 unique IDs in Drone surface: 7 mounted read operations, 7 dormant wrappers (six POST and file metadata GET). No PM reassignment/processing/assessment decision counted as Operator. Raw storage PUT is not another canonical API ID; no mounted write caller after gate. Shared authentication/profile belongs to cross-cutting inventory, not duplicated here. API-030 private video bytes has no Drone mounted caller and known MIME gap remains unverified.

## Executed evidence

Environment: Windows PowerShell, repository root, Candidate3 HTTP `http://127.0.0.1:18081`; credentials read privately in memory from container handoff, never printed/persisted. Only login POST; no task, upload, dataset or other resource mutations.

- Red before implementation: `node --test --test-reporter=spec tests/final-drone.test.cjs`: 6 FAIL (fixture constant + missing workflow). Added task gate red: 8 PASS/1 FAIL before gate fix.
- Latest focused: `node --test --test-reporter=spec tests/final-drone.test.cjs tests/h01c.test.cjs`: **19 PASS, 0 FAIL**, exit0. Ten new tests + nine existing H01C tests. LOGIC_TESTED only. Includes executable blocked handlers with transport spies, exact GET paths, wrong role/identity/project/pins, ETag, session/environment switch, source changed, HTTP failure propagation.
- `node tests/h01c-http-smoke.cjs`: exit0; ready200, API038/226/234 anonymous401; Operator A pages5/B pages1, six detail GET200 and exact server ETags; wrong Operator403. Positive API234 NOT_RUN; no upload fixture.
- `node tests/final-drone-http-smoke.cjs`: exit0; API026/API025 anonymous401, authenticated absent random resource404. Positive `BE_FIXTURE_BLOCKED`: no dedicated dataset fixture/discovery; script supports explicit existing authorized dataset via private environment input without creating data.
- Scoped `git diff --check`: exit0 (line-ending advisories only).
- Changed-file pattern scan: 0 Ionicons, 0 UD06 currency/presentation hits, 0 fixture aircraft constant, 0 private-key/token signature hits. Pattern scan is not complete security audit.
- Full regression and TypeScript: parent owns centralized gate to avoid concurrent runs; no claim made here.
- `NATIVE_VERIFIED`/`ANDROID_E2E_VERIFIED`: NOT_RUN. Camera/file-picker/large-video multipart/background/restart/device custody/storage-private-byte/download proof absent.

## Remaining acceptance dependencies

- `BE_DISCOVERY_GAP`: Operator source for registered active aircraft bound to work context (no seed or arbitrary UUID substitute).
- FE immutable durable command preparation/replay/reconciliation across sessions and restart for accept/decline/upload/dataset; no runtime mutation until supported.
- `BE_FIXTURE_BLOCKED` BE-09: disposable assigned survey task + genuine active aircraft + published pinned geometry + verified video/telemetry + dataset/coverage and safe authorized resource mutations/readback.
- API-025/026 positive HTTP still NOT_RUN. Authenticated404 is not positive dataset/coverage verification.
- API-030 video/mp4 vs application/octet-stream: source/HTTP compatibility unresolved; no bypass.
- No server flight-history discovery; existing honest unavailable UI retained.
- No claim of production readiness, upload completion, dataset acceptance or Android E2E.
