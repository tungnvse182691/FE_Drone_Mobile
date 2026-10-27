# CODEX-T03 — Reporter reads

## Plan and scope

Baseline `9efc8e43b336848f03b3e61ad529ce120c39c080`, main and origin/main equal; clean initial tree; Candidate3 /ready 200.

Use existing TanStack Query for account/session-scoped reads; preserve all existing screen layouts. No new dependencies. Scope: four Reporter screens, reporterApi.ts, authApi.ts only if cancellation is needed, new tests and this worklog.

1. API wrappers: cancellation for reads, opaque cursor query options, deduplicate loaded items, authenticated binary API-218 -> memory-only image preview. Test first with real Query observers and controlled transport.
2. Profile: GET /profile identity (not persisted login fallback), real API-215 counters explicitly limited to loaded reports; refresh/load-more/error states. Do not infer OTP verification from an email address.
3. Home/track: page cursor/load more, focus refresh, authenticated session gate and account/session-separated query keys, distinguish error from empty.
4. Detail: account/session-scoped focus refresh, safe owner failure, real routing status, evidence preview via API-218; no public URL or signed URL rewriting.
5. Verification: unchanged 69 T01/T02 tests + T03 regressions, typecheck, HTTP own/anonymous/wrong-owner/list pagination/detail/download/refresh; diff/secret review; independent review. Android E2E NOT RUN.
6. Recheck origin/main; commit/push only if gates pass and remote has not advanced. No T04.

## Evidence and final results

Date: 2026-10-27 (UTC+7). Review: Codex, with independent read-only T03 review.

### Changed files

| File | Change |
|---|---|
| app/(reporter)/profile.tsx | Real profile identity and paginated report counters; counters describe loaded reports, not an invented total. |
| app/(reporter)/home.tsx | Cursor pagination, focus refresh, guest/loading/empty/error/load-more states. |
| app/(reporter)/track.tsx | Same real paginated own-report history and session isolation. |
| app/(reporter)/report-detail.tsx | Real detail refresh, routing status, supplement projection, opt-in authenticated private image preview. |
| src/api/reporterApi.ts | AbortSignal, shared infinite-query options, ID deduplication, partial-page error handling, API-218 private binary download. Existing writes unchanged. |
| src/api/authApi.ts | Optional AbortSignal on existing fetchProfile only. |
| tests/t03.test.cjs | 28 regression tests using production wrappers, real Query observers and deterministic screen-hook harness. |
| tests/t03-http-smoke.cjs | Opt-in Candidate3 smoke using production Axios/wrappers and private disposable fixtures. |
| This worklog | Plan, review and verification evidence. |

### Contract evidence

Reviewed Reporter Screen–API Matrix (RPT-08/09/10), API catalog API-215/217/218 and Candidate3 sources under RoadGuardBackend:

- RoadGuardSystem.API/Controllers/ReportsController.cs and ProfileController.cs.
- RoadGuardSystem.DTOs/Reports/OwnReportDtos.cs and Identity/ProfileResponseDto.cs.
- RoadGuardSystem.Services/Implementations/Reports/ReporterLifecycleService.cs and Identity/IdentityService.cs.
- RoadGuardSystem.Repositories/Implementations/Reports/ReporterLifecycleRepository.cs.

API-215 returns opaque actor-bound cursors, default page size 20, no total count. API-217 applies owner checks and returns an ETag. API-218 returns private bytes, not a public URL. GET /profile supplies identity/role/status, but no emailVerified assertion. Query keys use actual JWT sub/sid, remain stable across same-session refresh and separate different sessions; tokens are not query keys. Images stay in memory; no filesystem persistence or external unauthenticated navigation.

### Verification

- `npm run typecheck`: exit 0 (final compiler run confirmed).
- `node --test --test-reporter=spec tests/t01.test.cjs tests/t01-client.test.cjs tests/t01-ui.test.cjs tests/t02.test.cjs tests/t03.test.cjs`: exit 0, **97 PASS / 0 FAIL** (69 existing T01/T02 + 28 T03).
- `git diff --check`: exit 0. Staged scope/whitespace/secret review performed before commit.
- `node tests/t03-http-smoke.cjs`: exit 0. Real Candidate3 HTTP, production Axios/client/wrappers; native Platform/crypto stubbed for Node. This is not Android execution.

| HTTP operation/scenario | Observed evidence | Status |
|---|---|---|
| /ready | 200 | VERIFIED |
| GET /profile | 200, returned user ID/Reporter role match fixture; anonymous 401 | HTTP VERIFIED |
| API-215 | Three pageSize=1 pages, 200 each, exact fixture IDs, no duplicates, cursor terminates; second owner empty; anonymous 401 | HTTP VERIFIED |
| API-217 | 200 with ETag and expected evidence ID; anonymous 401; wrong owner 404 | HTTP VERIFIED |
| API-218 | 200, downloaded PNG bytes exactly match fixture; anonymous 401; wrong owner 404 | HTTP VERIFIED |
| Read after real token refresh | Profile/list/detail/private image 200, same detail projection/image bytes | HTTP VERIFIED |
| Fixture upload/report setup | Signed storage URL unchanged, PUT 200 without Bearer; backend file VERIFIED with checksum/size/version checked, three own reports created | VERIFIED setup |
| Android E2E | No device/emulator execution | NOT RUN |

Fixtures: two disposable local Reporter accounts, own Mailpit OTP, synthetic one-pixel PNG. No shared/demo password changed. Secrets, OTPs, account addresses, signed URLs and raw transport errors are not logged or committed. Fixture records remain in the local test backend; no destructive cleanup or backend modification was performed.

Tests cover no-token gating, authoritative profile, wrong-owner denial, focus refresh, pagination/deduplication/repeated cursors, session isolation, private binary preview, error-vs-empty and partial page failures. Screen-hook harness does not prove native rendering. Cross-owner reuse of a cursor was not separately executed over HTTP. Supplement creation was not rerun in this read-only task; existing T01 evidence covers the mutation, while T03 tests preserve supplement rendering.

### Eight scoped review invariants

| Invariant | Result |
|---|---|
| MaterialIcons | PASS: changed screens use MaterialIcons, no Ionicons. |
| UD-06 | PASS: no money/material-cost UI introduced. |
| Fabric-safe navigation | PASS: full Reporter route groups; RootLayout unchanged. |
| Platform/role scope | PASS: authenticated Reporter session required for reads; no Crew/Drone/management changes. |
| Defect types | PASS: no new defect codes or classification logic. |
| Branding/technical standards | PASS: no branding, material or survey-standard changes. |
| Data contract | PASS: real DTO IDs/status/cursors, no invented count or OTP verification. |
| Error handling | PASS: no mock fallback; retry/loading/empty separated; auth/owner/session failures hide old data. |

### Self-healing and independent review

One review fix: initial next-page failure handling hid successfully loaded reports/counters. Expected behavior is to retain loaded own pages after transient next-page failure, with an explicit partial error, while hiding them after authentication/ownership/session failures. Added `canShowReportPages`, changed screen messages and added real observer/screen regressions. Final regression run: 97/97. Independent re-review: no actionable findings; no known P0/P1 in reviewed scope.

### UI / API / workflow and limits

| Screen | UI | API | Workflow |
|---|---|---|---|
| Profile | Existing design; real identity, loaded counters, refresh/retry/load more | /profile + API-215 verified | Session-scoped reads; no stale user fallback |
| Home | Existing design; guest/loading/empty/error/load more | API-215 verified | Focus refresh and paginated own history |
| Track | Existing design; loading/empty/error/load more | API-215 verified | Cursor history beyond first 20 |
| Report detail | Existing design; loading/error/retry, actual routing status, image loading/retry | API-217/218 verified | Owner-gated detail, private image preview, existing supplement navigation |

No runtime mock read remains in these targeted screens. Existing static project/hotline/privacy support copy remains static and is not HTTP-verified content. Public-update text is displayed from detail; no new publication-image API-210 controls were added. Private images are previewed in memory, not exported to the device. Native UI acceptance remains pending Android E2E. No known BE blocker from the HTTP scenarios above.

Delivery gate: scoped diff only; no known P0; compiler/tests/HTTP gates passed. Recheck remote before commit/push; stop if it advanced. No BE/Docker edits, no T01/T02 write-flow changes, no T04.
