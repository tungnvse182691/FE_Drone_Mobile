# Operator offline recovery UI — 2026-11-15

Codex, IMPLEMENT_AND_SELF_REVIEW. Base FE 1a8aa1b; BE pinned 85879fe. Scope: downloaded task list and local survey draft presentation. No API or persistence contract changes.

## Changes

- Replaced repeated task buttons and large gray cards with one accessible row per task, status, segment count and cached timestamp.
- Grouped draft information into work summary, selected files and recording information; added a compact toolbar and fixed save footer.
- File rows show one-line names, size and draft selection. Full names remain available to accessibility. Availability does not imply selection.
- Kept local-only notices, dirty-back confirmation, save lock, actor/environment guards and original media references.
- Design references: https://m3.material.io/components/lists/overview and https://developer.android.com/develop/ui/compose/components/app-bars . Existing project tokens and MaterialIcons only.

## Executed verification

- `npm run typecheck`: exit 0.
- `node --test tests/operator-local-files-ui.test.cjs tests/operator-local-detail.test.cjs tests/package6-drone-files.test.cjs`: 19/19 pass, `.cache/operator-ui-targeted.log`.
- `node --test --test-concurrency=2 tests/*.test.cjs`: 1696/1696 pass, no failures/skips, `.cache/operator-ui-final-regression.log`.
- `git diff --check`: clean; changed production files contain no debug logs, secrets or new network calls.
- ANDROID_E2E_VERIFIED for this UI checkpoint: Pixel_6_Pro, Android 14, Expo Go/Metro 8094; API reverse 18181 absent during offline test. Opened the 46-task cache, scrolled, opened private QA task 9cb55c3f…, focused recording inputs, verified save footer above keyboard, saved existing draft successfully, returned to list and reopened it. Video 49.1 MB and SRT 78 B remained selected, recordedAt remained 2026-11-15 08:30. No upload dispatched.
- Visual evidence inspected: `.cache/operator-local-list-v2.png`, `.cache/operator-detail-keyboard-v2.png`, `.cache/operator-detail-ui-final.png`.

## Limits

This checkpoint does not close remaining Operator acceptance: controlled network interruption, native cancel race/409 and session switch remain separate. Offline map and global Sync dispatch remain NOT_DONE. Storage 403 root cause remains UNKNOWN without the original storage response. API-226 supplementTaskId readback remains a separate reported BE issue. No push.
