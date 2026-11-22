# Crew Công việc — approved concept B metadata refinement

## Scope and authority

- Owner approved implementation with “ooke fix đi em”, referencing the two concepts; implemented the refined B list and metadata disclosure.
- Mode: IMPLEMENT_AND_SELF_REVIEW. Baseline main e0e1a337b45f8669515cf5b2de96b5fb35e839d2. Local checkpoint only; no push.
- Read RoadGuard, code-review, DESIGN, tokens, Taste, mobile-design, React Native and Expo UI guidance, existing worklogs/concepts. Taste is advisory; existing brand/contracts remain authoritative.

## Changes

- Only app/(crew)/tasks.tsx production presentation: underlined status tabs; search; expandable acceptance/mode selectors; compact list heading with data disclosure and refresh.
- Loaded subset count, scope note and server asOf retained under initially closed Dữ liệu. Pending/stale/error feedback remains outside the disclosure.
- Continuous task rows establish title/status/ID/acceptance/location/deadline hierarchy. Original ID expression and complete optional fields retained; code text selectable.
- Existing cursor pagination placed after the task list. All original predicates, API filter values, debounce, auth/ownership gates, navigation params and callbacks preserved.
- CrewInboxState shared export/default and its styles unchanged; Home and other screens untouched. No packages, API or business mutation changes.
- Updated isolated filter harness for disclosures and added checks for metadata state, retained task IDs, refresh/pagination callbacks and visible stale feedback.

## Android evidence

Directory: .cache/crew-tasks-flow-implement-20261122/

- before.png: actual pre-edit Android list.
- after.png: actual stable Android list after edits, all filters default, metadata closed, runtime task IDs/status/deadlines retained.
- data-expanded.png: actual metadata expanded, loaded subset 50 and server timestamp visible.
- filter-open.png: actual work-mode options expanded, all four options present.
- detail-open.png: read-only task opening reached Detail, ID 60a04265, Sandbox Crew FIELD fixture, submitted measure-only state.
- Quay lại danh sách returned to Công việc; the original first two FIELD codes were visible again (back-return.png).
- Pixel_6_Pro / emulator-5554, Android 14, native screen 1440×3120. Header observed below status bar; dock visible. Scroll and disclosure opening/closing observed. Some taps had delayed response; mode selection completion and broader interaction acceptance are NOT_VERIFIED, not claimed fixed by this UI work.
- No manual reload/restart/reset, logout or submit/accept/decline/upload mutation. Automatic Fast Refresh occurred from source edits.
- NOT_VERIFIED: physical phone/iOS, font-scale/narrow window, TalkBack, native Reduce Motion toggle, native network errors/offline, pagination completion and all acceptance/status combinations. Node tests do not substitute for these.

## Executed verification

- npx tsc --noEmit: exit 0, including final run.
- node --test tests/dot-c-crew-filter.test.cjs tests/crew-taste-tasks-presentation.test.cjs tests/crew-polish-layout.test.cjs tests/crew-home-task-press.test.cjs tests/crew-header-refresh.test.cjs tests/crew-task-status-ui.test.cjs: 18/18 PASS; targeted.log. Final run includes explicit refresh/pagination callback assertions.
- node --test --test-concurrency=2 tests/*.test.cjs: 1982/1982 PASS, zero skipped/failures; full-regression.log. Executed on final production diff; subsequent changes strengthened assertions in an existing test, rechecked in targeted run.
- git diff --check: PASS, only Git line-ending notice for test file.
- Icon scan app/src: no Ionicons. Scoped financial/secret scan: no prohibited additions. Diff self-review: business hooks, route params, API contracts, ownership/permission and shared Home presentation unchanged.

## Git and limits

Specific paths only: tasks.tsx, dot-c-crew-filter.test.cjs, this worklog. Preexisting untracked artifacts/database/native build preserved. No fetch/pull, branch switch, reset/clean/stash or deletions. Commit SHA is supplied in the delivery response (this document is part of that commit).

This checkpoint completes only the approved Công việc presentation. It does not certify unrelated navigation/native runtime problems or authorize another screen.
