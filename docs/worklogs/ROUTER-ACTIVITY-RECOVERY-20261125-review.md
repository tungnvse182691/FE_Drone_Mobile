# Android root router recovery

- Reviewer: Codex, IMPLEMENT_AND_SELF_REVIEW, parent 2f53bbb.
- Scope: mounted Crew/Operator UI and shared navigation components; replace imported global router with useRouter in the owning React component. Destinations, callbacks, permissions, layout and HTTP behavior unchanged.
- Root cause: Expo Router SDK 58 global routing bridge can be unbound by an older root cleanup after Android Activity recreation. Observed fatal `The imperative router is unavailable before the first render has finished.` Profile sync row reproduced after the initial shared-navigation-only fix.
- Reference: https://github.com/expo/expo/blob/main/docs/pages/router/migrate/sdk-57-to-58.mdx ; installed routingQueueContext.js and global-state/router.js.

## Executed verification

- npx tsc --noEmit: exit 0, router-tsc-r3.log.
- node --test --test-concurrency=2 tests/*.test.cjs: exit 0, 2111 passed, zero failed, router-full-final.log.
- Added five regression tests: global import gate, actual Profile sync action, default/custom BottomNav, AppHeader back/fallback with deliberately unavailable global bridge.
- Existing screen mocks now expose useRouter. Six missing mock failures in the first full run were corrected and rerun; no business assertions removed.
- git diff --check: exit 0. Changed runtime lines reviewed: imports and hook declarations only. No new icon, cost field, wire type, route, credential, or mutation.
- Embedded APK build and adb install -r succeeded. SHA256 153156C7C85AB883B96DBFF939489E0788BE0AD4C55CD9380631D524CB9701F8.
- Android emulator-5554, PID 13292: font 130% -> 100% -> 130% -> 100%; Crew tabs, Profile sync row, Home avatar, task detail and return navigated successfully after recreation. Session and one measurement draft remained. Final font 100%.
- router-android-r3.log has no FATAL, unavailable-router or ReactNativeJS Error match in that captured process. Screenshot router-profile-after.png inspected.
- Operator QA login, Home -> detail -> upload also opened on this APK.
- Evidence files: .cache/offline-session-20261124/ (local, not committed).

## Limits

ANDROID_E2E_VERIFIED applies to the listed navigation paths only; every migrated screen was not individually opened. Native signed dispatch, encryption coverage, 42A and three-role exactly-once acceptance remain separate. No emulator restart, app data removal, dependency change, Backend edit or push.
