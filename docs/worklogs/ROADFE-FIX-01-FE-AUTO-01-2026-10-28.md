# ROADFE-FIX-01 + FE-AUTO-01 — 2026-10-28

## Scope and authority

- Implementer: Codex, `IMPLEMENT_AND_SELF_REVIEW`. Baseline and fetched main:
  `a3fe10245520ec3dd82c31670dd996656d3b4cba`.
- Owner request and independent audit `ROADFE_INDEPENDENT_AUDIT_A3FE102_2026-10-28.md`;
  current AGENTS/roadguard/code-review, canonical 17_10 and existing real FE/BE contracts.
- Report5 APP/MOB/E2E labels are not implementation requirements or acceptance proof,
  per owner's clarification. No new endpoint, ownership claim token, or permission invented.
- Exactly eight production files authorized (six initial plus two explicitly approved):
  `src/store/reporter.ts`, `src/store/uploads.ts`, `app/(auth)/index.tsx`,
  `app/(auth)/otp-verify.tsx`, `app/(reporter)/uploads.tsx`,
  `app/(reporter)/capture.tsx`, `app/(reporter)/report.tsx`,
  `app/(reporter)/report-supplement.tsx`.
- No BE, Docker/config/data, shared SQL, SQLite schema, global auth client, Crew,
  Drone, offline dispatch or existing historical journal changes. No packages installed.
  Existing untracked `.cache/`, module Android build and `mydatabase.db` retained.

## Changes and behavioral limits

### RPT-01: ownership/privacy

- Authenticated restoration reads only the exact environment/actor/session draft.
  Removed guest fallback and initial adoption/claim writes, including post-success
  guest tombstone rewrites. `bindPendingDraft()` only restores an already-owned row.
- Login/OTP restore owned drafts, with generic guest-quarantine notice that does not
  display draft contents. Guest and legacy rows/URIs/command identities stay untouched.
- Render-scoped provenance fences capture actor/environment/session/epoch before
  queued autosave and async steps, recheck after awaits and on unmount; reset/hide
  stale screen state. Upload queue additionally filters the render by current partition.
- Login/OTP auth subscriptions detect intervening account changes, including ABA;
  late responses cannot authenticate over a replacement session.
- **Intended limitation:** guest-to-login continuation is unavailable without a
  source-backed ownership claim mechanism. Same device/environment is not proof.
  Guest rows remain guest-only; no claim endpoint is introduced. Session-partitioned
  pending data stays retained when another session cannot access it.

### RPT-02: recovery integrity

- `removeItem()` never physically deletes durable rows, even when called directly,
  memory is stale/missing, or a callback races. Delete controls are disabled with
  an adjacent explanation in capture/uploads. Existing transport/replay is unchanged.
- Conservative retention includes LOCAL_READY/FAILED/VERIFIED: there is no current
  authoritative cancellation/retirement or atomic cross-draft reference proof.
  IDs, URI, checksum, ETags, upload/file/session/verified versions and pending records
  are preserved. No automatic cleanup/migration of historical rows.
- **Intended limitation:** local queue cleanup is unavailable. Retained queue items
  may fill the existing three-photo capture limit; this task does not add unsafe cleanup.

## Automated evidence

Initial adversarial reproduction was added before production fixes:
`node --test tests/fix01-reporter.test.cjs` -> **0 PASS / 9 FAIL**, recorded in
`.cache/roadfe-fix01-red.txt`. After fixes those nine pass.

Final executed gate:

```powershell
node tests/automation/run.cjs --http-read
```

Evidence: `.cache/fe-auto-PYbzxA/evidence.json` and adjacent logs. Node `v22.15.1`.

| Check | Result | Boundary |
|---|---|---|
| All `tests/*.test.cjs`, TAP | **579 PASS, 0 FAIL, 0 skipped/cancelled**, exit 0 | LOGIC_TESTED |
| `npm run typecheck` | exit **0** | TypeScript only |
| `git diff --check` | exit **0** | Checked again after worklog/staging |
| New RPT store regressions | 9 PASS | Guest ownership plus eight media states |
| New actual TSX hook/handler regressions | 43 PASS | Login/OTP, autosave, late GET/picker/camera/GPS, actor/session/environment/ABA/unmount, disabled deletion/render partition |
| New disk SQLite regressions | 8 PASS | Production database helpers/upload SQL; isolated files, close/reopen, linked draft, timeout/exact replay, late complete response |
| New automation evidence regressions | 3 PASS | Zero-exit fixture absence/truncated output cannot become positive HTTP PASS |
| Secret patterns + manual changed-file review | PASS, no secret values found | Private keys, GitHub tokens, signed URLs, JWT patterns; not a proof against all possible secret formats |
| Icon/UD-06 scans | No Ionicons in tracked app/src, no financial UI pattern in app | No UI redesign |

The previous 516 tests are carried forward, with four **unsafe guest-adoption
expectations corrected** in `final-reporter-isolation.test.cjs`. Their interruption,
restart, successful cleanup and legacy-claim coverage remains; no test was simply
removed to hide a failure. T01/T02/UI harnesses gained hooks/subscription/DB injection
support, not production mocks. The 63 added tests account for 579 total.

SQLite tests execute production helpers/DDL only against new isolated files under
`.cache/fix01-sqlite-*`, never the app database. Node SQLite is experimental. Closing
and reopening a connection tests durable reload, **not** Android process death.
The TSX harness executes real handlers/effects/stores with deterministic native and
transport boundaries; it is **not** a React renderer, mounted Expo Router integration,
native permission test, or Android E2E.

## FE-AUTO-01 delivery

- `tests/automation/run.cjs`: existing suites once per invocation, typecheck, diff
  check, optional existing readonly Reporter HTTP smoke, sanitized local manifest/logs.
- `tests/automation/evidence.cjs`: positive HTTP status requires actual output markers;
  missing fixture stays BE_FIXTURE_BLOCKED even when child exits zero.
- `tests/automation/README.md`: real feature coverage and explicitly gated native
  scenarios. No Report5 expected-result copying, downloads, emulator or runtime mutation.
- New tests: `fix01-reporter.test.cjs`, `fix01-ui.test.cjs`, `fix01-sqlite.test.cjs`,
  `fe-auto-evidence.test.cjs`; shared helper `tests/helpers/roadfe-screen.cjs`.
- Existing tests adjusted: `t01.test.cjs`, `t01-ui.test.cjs`, `t02.test.cjs`,
  `final-reporter-isolation.test.cjs`.

## HTTP / Android / remaining blockers

Candidate3 local `http://127.0.0.1:18081/ready`: **200**. Existing
`tests/final-reporter-http-smoke.cjs` ran as the optional runner step; login is the
sole POST using the existing handoff fixture in memory. No credentials/IDs/response
bodies printed, no report/upload/assignment mutations.

| API / workflow | Actual evidence |
|---|---|
| API-215 GET reports | **HTTP_VERIFIED read**, authenticated list 200 |
| API-210/215/217/218 anonymous probes | 401 guards observed |
| API-210/217/218 authenticated absent resource | 404 only; positive content/detail/download NOT_RUN |
| OTP/upload/create report/supplement HTTP mutation | **NOT_RUN / BE_FIXTURE_BLOCKED** for this task; no private mutation fixture exercised |
| Android/native E2E, permissions/Keystore/process death | **NOT_RUN**; no device approval/runtime execution, no emulator launched |
| Crew/Drone/offline blocked capabilities | Unchanged; no new mutation access |

Independent reviewer `/root/fix01_review`, `AUDIT_READ_ONLY`, reviewed current
baseline-to-working-tree source/tests and retained evidence; made no file/index
changes and executed no tests. Reported **no P0/P1**. Implementer owns executed
verification above. Reviewer found HTTP zero-exit overclaim P2; fixed and covered by
three new evidence tests before final run.

**Remaining P2:** login may restore an owned pending draft after RootLayout already
routes to home; blur then suppresses login's automatic redirect. Data remains durable
and accessible by opening the report route in the same session. RootLayout was not
changed; automatic resume across that mounted navigation race is not claimed tested.
Native/full Router acceptance remains pending. No P0/P1 identified in this scoped
implementation/review; this does **not** certify Mobile API closure or production readiness.

Remote rechecked before delivery; only explicit allowed source/test/worklog paths
staged. No force-push, no local artifact cleanup, no checkpoint beyond this task.
