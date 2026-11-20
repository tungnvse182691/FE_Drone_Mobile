# Operator tab stack fix — 2026-11-20

Mode: IMPLEMENT_AND_SELF_REVIEW (Codex). Base: main `0cb9fe6`.
Scope: Operator tab switching only. Commit SHA: resolve with `git log -1 --format=%H -- docs/worklogs/2026-11-20-operator-tab-stack-fix.md`.

## Root cause and change

Shared BottomNav defaults to router.push. Selecting Requests while Detail A / Work Package A are underneath pushes another list; Back can legitimately reveal the old Work Package. This is the proven tab-stack defect, distinct from intermittent header touch nonresponse.

Operator layout now supplies its own onNavigate. It reads the current child navigator at tap time and synchronously targets only that navigator with a complete SDK 58 reset state. Existing tab roots retain original keys/params/order, duplicate roots collapse, nested history is removed on explicit tab selection, and selection pops to the existing target or adds a first-visit target. An already-active root is a no-op. Selecting an earlier root removes later roots; later revisits can remount those screens. This does not promise indefinite state persistence for every tab.

Runtime files: `app/(drone)/_layout.tsx`, `src/navigation/operatorTabNavigation.ts`.
Tests: new `tests/operator-tab-stack.test.cjs`; dependency mocks updated in `tests/operator-navigation-ime.test.cjs` and `tests/reporter-nav01.test.cjs` only. Shared BottomNav, other roles, Detail/WP Back handlers, task params, API, permissions, upload/media, journal/recovery/offline are unchanged.

An exploratory approach that reordered mounted tab roots caused a blank native scene/ANR and was rejected before commit. Final code pops in original order. Owner reopened RoadGuard after Expo Go exited; all final native evidence below was collected after that reopen. Exploratory screenshots/logs are not final proof.

## ANDROID_E2E_VERIFIED — final implementation

Environment: local emulator-5554, Expo Go, 1440x3120, installed expo-router 58.0.31. Normal UI taps, no deep links, no mutations or pending-command replay. Navigator `navigator:0-2`.

1. Home → Requests (`requests:0-2-2`) → Detail B (`25324063`) → header Back: same Requests root.
2. Requests → Detail A (`c48b2765`) → WP A → Requests tab: both nested A routes removed, original Requests key retained.
3. Detail B has correct taskId/code; header Back returns Requests; Android Back reaches Home, never WP A.
4. Requests (`requests:0-2-7`) filtered Cần bổ sung, 2/50 → Sync → Profile → Requests: same Requests key and visible filter/content retained. No blank scene on final sequence.
5. Tap active Requests: stack/index/key sequence unchanged.
6. Requests → Log read-only → Requests tab: Log removed; same Requests key retained.

Evidence (local untracked artifacts preserved):

- `.cache/operator-tab-stack-fix/final-stack.json`: full final route states and params for each step.
- `v2-01-basic-back.png`: basic Back, under same directory.
- `v2-02-tab-clears-A.png`: Requests after leaving A.
- `v2-03-system-back-home.png`: Android Back reaches Home (existing Home scroll offset retained).
- `v2-04-filter-retained.png`: Requests filter retained after Sync/Profile/Requests.

Metro `get_console_logs(search="not handled", format="json", limit=50)` returned `[]` after final navigation. This is limited to retained Metro logs, not a claim that historical warnings never occurred.

## Executed gates

- `npm run typecheck`: PASS, exit 0, no TypeScript diagnostics; rerun after final native checks.
- `node --test tests/operator-tab-stack.test.cjs tests/operator-navigation-ime.test.cjs tests/reporter-nav01.test.cjs`: PASS 35/35 (final rerun).
- `node --test --test-concurrency=4 tests/*.test.cjs`: FAIL 1, PASS 1949 / total 1950; `.cache/operator-tab-stack-fix/regression-v2.log`. Full suite is NOT green.
- Existing failure: `tests/package6-drone-journal.test.cjs:375`, URL-admission generation expected 1, actual 2. Fixture expiresAt `2026-11-20T00:00:00Z` at lines 317/320 is expired at execution. Prior baseline investigation reproduced it and isolated Nov19 clock passed. Test/upload implementation untouched; not repaired outside this scope.
- `git diff --check`: PASS (Git emits LF/CRLF normalization warning for existing test file).
- Self-review: runtime diff limited to Operator layout/helper; no UI/API/other-role runtime change, no credentials or private URLs introduced. Actual installed StackRouter exercised by tests, including old-push reproduction and target navigator boundary.
- Remote main checked with `git ls-remote origin refs/heads/main`: `1c852e95bbf9f849885ce0fe75e561ebd6c9682d`, unchanged from fetched origin/main. No push/pull/branch change.

## Limits

NOT_RUN: in-flight upload/background transfer while changing tabs, durable SQLite restart/recovery, HTTP mutations, other physical devices. No mutation authorization for those tests. Existing pending upload/journal entries were not opened/replayed.
Intermittently unresponsive header Back remains unpatched as requested; successful header taps in these flows do not establish its root cause or permanent resolution. Scroll-position persistence was not separately measured; filter/root identity was verified as above.
No emulator restart, reset, data/cache deletion or settings change in final verification. Existing untracked artifacts retained. Commit is local on main; no push.
