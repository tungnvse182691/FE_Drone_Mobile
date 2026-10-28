# FINAL Reporter G5 — 2026-10-28

Mode: `IMPLEMENT_AND_SELF_REVIEW`, scoped Reporter subagent; independent review pending. FE baseline `1ed634640c23661e269c0c4c4c68253edd5da005`. BE pinned develop `01cc4725b178199215b02f4ddf7093491a16f2f7`. No stage/commit/push, dependency install, BE edit or state-changing HTTP performed by this workstream.

## Scope and changes

- `src/api/reporterApi.ts`: API-210 `downloadPublicationEvidenceReal`; requires actual own-report publication/evidence membership and nonempty GUIDs, authenticated Axios client, cancellation, request `Cache-Control: no-store` and `Pragma: no-cache`; common bounded JPEG/PNG-to-data-URI decoder reused by existing API-218.
- `app/(reporter)/report-detail.tsx`: each API-217 `publicUpdates[].evidenceIds[]` has an opt-in preview, passing `publicUpdates[].id` as publicationId and current report.id as recipient reportId. No typed/public URL input. Distinct publication/private query keys include session and all parent IDs. React keys reset previews on session/resource changes; navigation blur resets opt-in; cached bytes hidden while revalidating or denied. Query GC zero; no filesystem/persisted media URL. Private API-218 remains a separate route.
- `tests/final-reporter.test.cjs`: 21 tests for actual production wrapper and screen logic under isolated harness. Includes no-source/missing/withdrawn publication, wrong evidence/publication, invalid parent GUID, 401/403/404/409/503 propagation without private fallback, invalid media/status/empty/oversize, mounted DTO lineage, opt-in, query identity, blur and failed/in-flight revalidation. These tests do not establish BE recipient/revocation execution.
- This worklog: source/inventory/evidence and remaining dependencies.

## Authority and publication semantics

Exact pinned sources fetched read-only through `D:/tools/gh/gh.exe api -H 'Accept: application/vnd.github.raw+json' repos/HoangAnhVu2207/RoadGuardSystem/contents/<file>?ref=01cc4725b178199215b02f4ddf7093491a16f2f7`; compared normalized CRLF/LF text against Candidate3. Identical for `ReporterEvidenceController.cs`, `AuthController.cs`, `ReporterRegistrationsController.cs`, `ReportsController.cs`, `ReporterLifecycleRepository.cs`, `AnhHuyFactsRepository.cs`, `AnhHuyProducerService.cs`, and `ReporterEvidenceService.cs`. Last source comparison run 2026-10-28 19:38–19:42 +07. This is source evidence, not API HTTP acceptance.

- `RoadGuardSystem.API/Controllers/ReporterEvidenceController.cs:122–139`: API-210 `[Authorize]`, actor claims required; success streams bytes, errors 403/404/409/503.
- `RoadGuardSystem.Services/Implementations/Integration/AnhHuyProducerService.cs:41–53`: current active Reporter required; verified file/version/owner/private REPORT_PHOTO lineage required.
- `RoadGuardSystem.Repositories/Implementations/Integration/AnhHuyFactsRepository.cs:31–48`: publication/evidence/recipient report join plus `report.ReporterUserId == actorId`; source report/evidence relation required. Possession of IDs is insufficient.
- `RoadGuardSystem.Repositories/Implementations/Reports/ReporterLifecycleRepository.cs:104–116`: own-report updates originate recipient join and project `CasePublication.Id` and `p.EvidenceIds`. This proves genuine UI publication-ID discovery.
- `RoadGuardSystem.Services/Implementations/Files/ReporterEvidenceService.cs:158–171`: rechecks VERIFIED/current version before opening storage bytes.

`PRODUCT_SOURCE_GAP` / ambiguous task wording: review G5 describes API-210 as public/anonymous; actual API-210 is recipient-authorized authenticated content. Anonymous `GET /api/v1/public/publications/{publicId}` exists in pinned `PublicPublicationsController.cs:19–26`, returns PublicPublicationDto and no-store; it is a separate publication namespace. No FE mapping between those publicIds and CasePublication.Id has been proven. Do not reuse IDs or issue anonymous API-210. Revocation/withdrawal of the separate public publication does not prove removal of the recipient publication. Backend/product must supply intended relation and eligible fixtures before anonymous evidence can be claimed.

API-210 controller does not explicitly write `Cache-Control`; a request no-store header does not prove response/proxy/native HTTP cache behavior. Positive bytes and response header inspection remain `BE_FIXTURE_BLOCKED` / `NOT_RUN`. Server should deliver/document `private, no-store` for sensitive content if absent in actual deployment. No BE change made.

## Executed verification

Environment: Windows PowerShell, local Node/TypeScript and existing dependencies, FE baseline above plus concurrent scoped agent changes. No test dependency installed.

1. RED: `node --test tests/final-reporter.test.cjs` before implementation: 16 API tests failed because wrapper absent. Added screen tests before screen implementation; red observed. Later added cached-image-during-revalidation test, observed assertion failure, then hid image during fetching.
2. GREEN: `node --test tests/t01.test.cjs tests/t01-client.test.cjs tests/t01-ui.test.cjs tests/t02.test.cjs tests/t03.test.cjs tests/final-reporter.test.cjs` → **118 passed, 0 failed, 0 skipped**, exit0 (last run duration 9948 ms). `LOGIC_TESTED`; includes 21 new tests plus 97 existing auth/Reporter tests.
3. `git diff --check -- src/api/reporterApi.ts 'app/(reporter)/report-detail.tsx'` → exit0, no output.
4. Changed source/test `Select-String` for Ionicons, forbidden presentation terms/technology, console logging, bearer literals and password assignments → no matches. No secret, credential or presigned URL output generated.
5. `npm run typecheck` → `tsc --noEmit`, exit0, no diagnostics (2026-10-28 local run); root still owns final full regression/typecheck after all agent edits.

Current API-210 status: `API_CONNECTED`, `LOGIC_TESTED`. HTTP positive bytes, wrong-recipient actual HTTP, revoked-publication HTTP, server cache headers, MinIO byte equality, Android preview/background behavior: **NOT_RUN**, `BE_FIXTURE_BLOCKED` for missing authorized publication/Reporter fixture. No existing state-changing smoke scripts were executed because they create actors/reports/uploads and this workstream is restricted to read-only HTTP. No authenticated private fixture was available to discover legal positive report/publication/evidence IDs. No UUID guessed for production HTTP.

## Complete Reporter operation inventory (deduplicated here)

All paths below have `/api/v1` prefix. Role is current server actor/resource requirement; public bootstrap still validates credentials. HTTP statuses/readback in this run are **NOT_RUN for every row**. Native/Android gate **NOT_RUN for every row**. Existing wrappers/callers establish connection only. Common auth/upload rows must be deduplicated against other role inventories by API ID + method + path.

| API | Method/path | Actor / scope | Wrapper / actual mounted caller | Readiness and remaining gate |
|---|---|---|---|---|
| 002 | POST `/auth/android/login` | anonymous credential bootstrap | authApi.loginReal → `(auth)/index` | API_CONNECTED; auth logic tests; OTP/session HTTP fixture |
| 003 | POST `/auth/android/refresh` | anonymous refresh credential | client.refreshAccessToken (single flight interceptor); authApi.refreshReal is not mounted caller | API_CONNECTED; T01 client logic tested; actual contention/native secure persistence |
| 004 | POST `/auth/change-password` | authenticated current user | authApi.changePasswordReal → `(auth)/force-change-password`, from Reporter account | API_CONNECTED; T02 logic tested; disposable credential mutation |
| 005 | POST `/auth/forced-password-change` | anonymous current credentials/operationId | authApi.forcedChangePasswordReal → `(auth)/force-change-password` | API_CONNECTED; logic tested; server-required fixture |
| 007 | POST `/auth/logout` | authenticated current session | authApi.logoutReal → store/auth.logout → Reporter account/profile | API_CONNECTED; best effort async; remote revoke/other-session proof |
| 008 | POST `/auth/password-recovery-requests` | anonymous request only | authApi.requestPasswordRecoveryReal → Reporter account / auth recovery | API_CONNECTED; T02 logic tested; no reset-success claim |
| 010 | POST `/auth/reporter-registrations` | anonymous | reporterApi.registerReporterReal → `(auth)/register` | API_CONNECTED; auth form replay dependency R-GAP-01 |
| 011 | POST `/auth/reporter-registrations/resend` | anonymous intent | reporterApi.resendReporterOtpReal → `(auth)/otp-verify` | API_CONNECTED; cooldown/retry dependency R-GAP-02 |
| 012 | POST `/auth/reporter-registrations/verify` | anonymous intent + OTP | reporterApi.verifyReporterOtpReal → `(auth)/otp-verify` | API_CONNECTED; Mailpit expiry/attempt/rate limit fixture |
| 047 | GET `/profile` | authenticated current actor | authApi.fetchProfile → Reporter profile (checks returned userId/role) | API_CONNECTED; T03 identity tests; HTTP read |
| 208 | GET `/reporter-evidence/files/{fileId}` | active Reporter own private REPORT_PHOTO | uploads.httpUploadTransport.getFileMetadata → uploads store → Reporter capture/uploads/report/supplement | API_CONNECTED; VERIFIED/checksum gate; MinIO/native runtime |
| 209 | GET `/reporter-evidence/files/{fileId}/content` | active Reporter own private VERIFIED file | no FE wrapper/mounted caller; API218 serves submitted evidence preview | NOT_CONNECTED; would require genuine verified queue source; not counted as mounted API |
| 210 | GET `/reporter-evidence/publications/{publicationId}/reports/{reportId}/evidence/{evidenceId}/content` | active Reporter owning recipient report, scoped publication projection | reporterApi.downloadPublicationEvidenceReal → report-detail.EvidencePreview via API217 publicUpdates | API_CONNECTED, LOGIC_TESTED; positive/negative HTTP/cache/revocation/bytes fixture needed |
| 211 | POST `/reporter-evidence/uploads` | active Reporter private owner | uploads.httpUploadTransport.createSession → store/uploads → Reporter capture/uploads/report/supplement | API_CONNECTED; immutable upload ledger exists; disposable upload/native proof |
| 212 | GET `/reporter-evidence/uploads/{uploadId}` | same private owner | uploads.httpUploadTransport.getSession → store/uploads recovery/poll | API_CONNECTED; actual resume/session expiry proof |
| 213 | POST `/reporter-evidence/uploads/{uploadId}/complete` | same owner + K + session strong If-Match | uploads.httpUploadTransport.completeUpload → store/uploads | API_CONNECTED; complete ≠ VERIFIED; checksum/storage proof |
| 214 | POST `/reporter-evidence/uploads/{uploadId}/part-urls` | same owner + K | uploads.httpUploadTransport.requestPartUrls → store/uploads; raw storage PUT via isolated storageClient | API_CONNECTED; no bearer to storage client; expiry/size/checksum/part order HTTP proof |
| 215 | GET `/reports` (`cursor`,`pageSize`) | active Reporter own reports only | reporterApi.listMyReportsReal/reporterReportsOptions → Reporter home/track/profile | API_CONNECTED, LOGIC_TESTED paging/dedupe/session/partial errors |
| 216 | POST `/reports` | active Reporter own VERIFIED file/version + K | reporterApi.submitReportReal → store/reporter.submitPendingDraft → Reporter report | API_CONNECTED; persisted request/key before POST, API217 evidence readback; R-GAP-03 |
| 217 | GET `/reports/{reportId}` | active Reporter owning report | reporterApi.getOwnReportReal → report-detail/report-supplement + store/reporter readback | API_CONNECTED, LOGIC_TESTED; HTTP cross-owner/readback fixture |
| 218 | GET `/reports/{reportId}/evidence/{evidenceId}/download` | active Reporter owning report; own or explicit publication source | reporterApi.downloadReportEvidenceReal → report-detail private evidence preview | API_CONNECTED, LOGIC_TESTED; byte/private auth HTTP proof |
| 219 | POST `/reports/{reportId}/supplements` | active Reporter owner + verified files + K + report strong If-Match | reporterApi.submitReportSupplementReal → store/reporter.submitPendingDraft → report-supplement | API_CONNECTED; immutable pending request/If-Match and readback; 412/source/version native proof |

Not part of Reporter current journey: API035 `/me` has an unused wrapper but no mounted Reporter caller; desktop cookie auth APIs006/009 are not substituted for Android auth. PM/Supervisor publication creation/withdrawal is excluded. Public anonymous summary route above is not numbered in the old Phase2C catalog and not wired here without genuine source/publicId mapping. Feedback screen remains honest unavailable (no claimed rating mutation).

## Journey audit and required external scope

Read Reporter layout and all report/list/detail/account/upload/capture/supplement entrypoints, auth register/OTP/session/password, reporter store pending draft and uploads transport/store. No new mutation added; existing blockers below remain visible in acceptance ledger. Source review is not a native/HTTP execution claim.

| ID / priority | Evidence / actual behavior | Expected / next owner action |
|---|---|---|
| R-GAP-01 P1 acceptance blocker | `(auth)/register.tsx:81` clears key on every error, including timeout; subsequent deliberate retry allocates a new command key. Key scope is email only while body may change. | Shared auth scope expansion: capture immutable registration attempt/key, distinguish uncertain outcome, retain exact retries; secrets stay memory-only. No edit here, root explicitly requested documentation only. |
| R-GAP-02 P2 | `(auth)/otp-verify.tsx:25,46,133–137` fixed cooldown60; API011 response discarded, `resendAfterSeconds` ignored; resend always new key even uncertain retry; error map uses uppercase domain names while controller maps validation_error/not_found/email_conflict/duplicate_request/internal_error. | Shared auth scope: use server cooldown and immutable intentional resend attempt with timeout reconciliation; show rate limit/expired/invalid generic safely. Mailpit fixtures needed. |
| R-GAP-03 P1 acceptance blocker | `src/store/reporter.ts:38,55–60,180–185` partition uses actorId only, per-await check only userId, pending journal lacks environment/session provenance. `src/store/uploads.ts:548–570` likewise actor/partition checks. | Separate authorized shared store migration/checkpoint: environment provenance, session fencing through all awaits/A→B→A, preserve pending immutable command and reconcile before cross-session sends. Do not erase draft/media. Existing client sub/sid guard mitigates individual HTTP calls but does not prove full store pipeline fencing. |
| R-GAP-04 P2 / BE_CONTRACT_GAP | API210 actual source authenticated recipient stream; anonymous review target differs; private response no-store not explicit in controller. | Backend/product clarify anonymous-public DTO mapping vs recipient publication; provide real authorized IDs and response cache contract. Do not disable recipient guard. |
| R-GAP-05 BE_FIXTURE_BLOCKED | No authorized disposable Reporter/OTP/report/private upload/publication fixture available in workstream. | BE-10: provide two Reporter actors/sessions (privately), own submitted report/detail with publicUpdates publication/evidence, verified matching bytes/hash/version, other-recipient denial case, removed relation/publication case, current readback; explicit disposable mutation authorization for OTP/upload/report/supplement. Avoid shared demo mutation. |
| R-GAP-06 NOT_RUN | Android camera/picker/OTP/background, Expo SQLite durable journal, native cache and upload MinIO bytes not executed. | Device and isolated fixture proof before NATIVE/ANDROID_E2E or HTTP_MUTATION labels. |

No full API/product closure, anonymous evidence acceptance, native acceptance, or independent review claimed. Root owns remaining global verification and integration.

## Owner-approved follow-up: registration / OTP / Reporter partition hardening

Scope expanded explicitly by owner (relayed by parent): `app/(auth)/register.tsx`, `app/(auth)/otp-verify.tsx`, `src/store/reporter.ts`, then separately approved `src/store/uploads.ts`, plus scoped tests. Mode remains IMPLEMENT_AND_SELF_REVIEW; independent reviewer findings are credited separately below. No HTTP mutation, package install, native change, git stage/commit/push in this stream.

This section supersedes the earlier source-only R-GAP-01/02/03 findings for the implemented logic scope:

- Registration retains an immutable in-memory payload + UUID across timeout/retry/remount; edited payload/environment is blocked until the uncertain attempt is resolved. A declared terminal 4xx permits correction. Password is never stored in SQLite/persist middleware/route params/logs. Process death loses the in-memory secret-bearing attempt: automatic replay after process death is NOT claimed.
- OTP receives API010 `resendAfterSeconds` through non-secret route metadata, then uses API011 response cooldown and a wall-clock deadline. Resend retains the same key through uncertain outcomes; a confirmed response ends that command. Error messages match current lowercase controller mapping (`validation_error`, `not_found`, email conflict, duplicate request, internal error), with neutral fallback.
- Register/verify/resend async completions are fenced by focused-screen generation, environment, and captured auth state. They cannot log in/navigate/downgrade another session after blur or login change. Verify rechecks the new authenticated context after draft adoption before navigation.
- Reporter drafts and uploads use a v2 partition containing configured API environment, actor id, and actual JWT sub/sid continuity. Missing/opaque/mismatched subject claims fail closed. JWT parsing supplies continuity only, never authorization. Refresh retains sub/sid identity; auth transitions increment a process epoch, stopping A→B→A continuations even when A returns with the same claims.
- Old `reporter-pending:{actor}` and `reporter-{actor}` upload rows are quarantined untouched: no automatic provenance fabrication/adoption or deletion. Existing capture/upload actor hints are mapped to the current partition, never used to load old storage rows. Their pending bytes and journal keys remain on disk for a future authorized reconciliation workflow.
- Guest drafts retain their local URIs/command. Same-environment adoption records an exact actor/session claim before actor persistence. A crash between writes is recoverable only by that exact provenance. Guest local queue ids are detached when binding (bytes retained), allowing a new session-scoped upload row. Successful readback retains a retired claim tombstone before deleting the active actor row, preventing completed draft resurrection; original bytes/identity remain retained in the claim.
- Every Reporter continuation and upload transport/update boundary checks captured context. Changing actor, login sid, or environment prevents the next upload request or report mutation. Native filesystem and SQLite guarantees are not inferred from these harnesses.

Tests changed: `tests/t01.test.cjs` harness now uses explicitly synthetic JWT sub/sid and API environment, and emits auth subscription transitions; original20 regression cases/assertions retained. Added `tests/final-reporter-hardening.test.cjs` (10 cases) and `tests/final-reporter-isolation.test.cjs` (13 cases). New harnesses execute production TypeScript with deterministic native boundaries. Auth behavior assertions were observed failing before fixes; store fault-injection and isolation assertions additionally verified discovered crash/recovery edge cases. Independent reviewer `final_review` identified claimed-guest crash/reappearance and late auth completion findings; this implementer fixed them, and the reviewer confirmed earlier guest/OTP findings resolved at source level. This is not an independent-review claim for the entire patch.

Executed final focused command (HEAD baseline still `1ed634640c23661e269c0c4c4c68253edd5da005`, uncommitted workspace; Windows/Node):

```powershell
node --test tests/final-reporter-hardening.test.cjs tests/final-reporter-isolation.test.cjs tests/t01.test.cjs tests/t01-ui.test.cjs
```

Result: **47 passed, 0 failed, 0 skipped**, exit0, duration1907.1618ms. Label `LOGIC_TESTED`. Scoped `git diff --check` clean after changes. Root owns final whole-workspace typecheck and full regression; this stream did not run those again per delegation. `HTTP_VERIFIED`, native SQLite restart/media cache, Android OTP/camera/background acceptance remain **NOT_RUN** for this expansion. Existing fixture/native blockers R-GAP-04/05/06 remain; source/logic hardening does not close positive HTTP/native evidence.
