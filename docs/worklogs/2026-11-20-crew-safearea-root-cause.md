# Crew safe area — investigation and unverified patch

## Checkpoint

- Date: 2026-11-20. Codex, IMPLEMENT_AND_SELF_REVIEW; not independent review.
- Branch: main. Base HEAD: d43e2eb116513547cfb6f93d823aa2b3cc57de53.
- Status: BLOCKED_NATIVE_VERIFICATION. Not FIXED, not accepted, no commit or push.
- Expected: Crew header below the real status-bar inset across tab transitions and Back, without double inset or fixed-pixel offsets.

## Evidence and boundary of conclusion

Android Pixel_6_Pro / emulator-5554, Android 14 API 34, 1440x3120px, density 560 (3.5px/dp). Status bar 145px; navigation bar 84px. App bounds observed: 0,0 to 1440,3036px.

Existing faulty native image: `.cache/crew-industrial-premium-20261120/tasks-safearea-followup.png`: brand top approximately y43px inside status bar 0–145px. Correct brand top approximately y188px. This difference is 145px, matching the status-bar inset. Current correct baseline: `.cache/crew-safearea-20261120/home-baseline.png` and `tasks-before-error.png` (the latter filename is misleading: visually correct, not proof of failure).

Temporary dev instrumentation recorded the nearest provider and header-local layout in `.cache/crew-safearea-20261120/probes-before.log`. It has been removed from production source before this checkpoint.

| Route/time (device log) | Provider top dp | Header-local y dp |
| --- | ---: | ---: |
| tasks 15:34:09.963 | 41.42857 | 0 |
| tasks 15:34:10.564 | 41.42857 | 41.42857 |
| profile 15:37:01.467 | 41.42857 | 0 |
| profile 15:37:08.223 | 41.42857 | 41.42857 |
| tasks 15:37:53.678 | 41.42857 | 0 |

The observed failure boundary is native SafeAreaView top padding not matching already-valid provider insets during this development session. It is not evidence that Expo Router lacks a provider. Header-local relative position is relevant; `measureInWindow` returned y=-41.42856dp for the shell/screen even in correct states, so that measurement alone does not prove physical window displacement.

Shell viewport remained approximately 411.42856x867.42859dp; dock 64.85718dp, keyboard false, provider bottom 0. Native navigation bar size and provider bottom are different measurements and are not interchangeable. No evidence justifies changing dock, keyboard viewport, or StatusBar configuration.

Installed source was inspected: Expo ~58.0.25, Router ~58.0.31, safe-area-context 5.11.1, RN 0.88.1, screens 4.30.1. Router already owns a SafeAreaProvider. Native SafeAreaView keeps its own Fabric inset state; the exact attach/state propagation race remains UNPROVEN. Measurements were collected after temporary instrumentation/Fast Refresh; cold-start/release reproduction has not been established.

## Navigation exercised before blocker

Read-only normal tab navigation included Home → Tasks → Profile → Tasks, followed by another Profile → Tasks sequence. Logs above show both valid and zero local inset states. Navigation was delayed; some transition screenshots still show the previous screen/ripple and are not accepted as destination/error proof. No claim of completed repeated acceptance loops or Detail/Back acceptance is made.

## Executed verification

- `npx tsc --noEmit`: exit 0, PASS (exec session 76757).
- `node --test tests/crew-safearea.test.cjs tests/crew-nav01.test.cjs tests/operator-navigation-ime.test.cjs tests/operator-tab-stack.test.cjs tests/reporter-nav01.test.cjs tests/t05b.test.cjs`: final run 128/128 PASS. Log `.cache/crew-safearea-20261120/targeted-final.log`.
- `node --test --test-concurrency=2 tests/*.test.cjs`: exit 1, 1952/1954 PASS, two failures, 296030ms. Log `.cache/crew-safearea-20261120/full-regression.log`. Started before final harness correction: one failure was missing createContext in the crew-nav01 mock, subsequently corrected and passed in the targeted run; other failure is existing Operator URL-admission fixture in `tests/package6-drone-journal.test.cjs:375`. No full-suite rerun on final harness; do not report full regression PASS.
- `git diff --check`: exit 0, PASS; Git reports LF-to-CRLF warning on crew-nav01, not a whitespace error.
- Temporary probe strings absent from app/src (`rg` no matches). Index empty; no commit.

## Native blocker

After source edits and automatic Fast Refresh, Expo Go recreated its activity and showed missing native modules `ExpoSQLite` and `ExpoCrypto`, followed by ErrorBoundary/default-export cascades. No explicit app reload/restart/reset was performed. Screenshot: `.cache/crew-safearea-20261120/native-verification-blocked.png`; filtered log: `native-blocker.log`. This is a blocker, not proof of a dependency or database defect; no native configuration, dependency or data was changed to bypass it. No AFTER image of patched Crew exists. Per owner instruction, stop native work here pending a usable session; do not commit an unaccepted patch.

## Candidate patch — WIP only

- `src/components/SafeAreaScreen.tsx`: a route-group context opts Crew Android into View padding from the nearest `useSafeAreaInsets()` provider. Top/left/right come from real insets; no constants, cached fallback, additional SafeAreaProvider or second native top inset. Bottom remains owned by dock. Other roles and iOS retain native SafeAreaView edges.
- `app/(crew)/_layout.tsx`: opts existing CrewScreenShell into this presentation-only behavior; viewport, keyboard, dock, Stack, params and navigation handlers unchanged.
- `tests/crew-safearea.test.cjs`: first-render inset ownership, dynamic/zero insets, other platform/role default and Crew-only scope checks. JS contract tests do not prove native Fabric behavior.
- `tests/crew-nav01.test.cjs`, `tests/t05b.test.cjs`: local harness mocks for the added context/component import; original assertions retained.
- Camera/navigation route source, AppHeader, tokens, API/session/business/media/offline/journal source unchanged.

This patch bypasses the observed native-padding mismatch for Crew Android, but effectiveness and transition stability have NOT been verified on Android. It must not be represented as a proven native lifecycle repair.

## Native blocker

After source edits, automatic Fast Refresh recreated the app activity/JS runtime. No explicit reload/restart/reset/logout action was issued. Expo Go then reported `Cannot find native module 'ExpoSQLite'` and `Cannot find native module 'ExpoCrypto'`; an ErrorBoundary undefined error/default-export warnings also appeared. Their exact cause is not established by this task and no dependency/config changes were made.

- Screenshot: `.cache/crew-safearea-20261120/native-verification-blocked.png` (inspected).
- Filtered native log: `.cache/crew-safearea-20261120/native-blocker.log`.
- No patched Crew AFTER screenshot exists. The error screenshot is blocker evidence, not AFTER acceptance.
- Stopped native interaction rather than restarting the app, resetting data, or speculatively patching native modules.

## Executed verification

- `npx tsc --noEmit`: PASS, exit 0.
- `node --test tests/crew-safearea.test.cjs tests/crew-nav01.test.cjs tests/operator-navigation-ime.test.cjs tests/operator-tab-stack.test.cjs tests/reporter-nav01.test.cjs tests/t05b.test.cjs`: final 128/128 PASS; log `.cache/crew-safearea-20261120/targeted-final.log`. Earlier run 127/128 exposed missing createContext in the test harness; mock corrected without weakening assertions.
- `node --test --test-concurrency=2 tests/*.test.cjs`: launched before that harness correction; final result recorded below after completion. Log `.cache/crew-safearea-20261120/full-regression.log`. Owner baseline is 1949/1950 due expired Operator URL fixture; do not report all PASS.
- `git diff --check`: PASS (Git notes LF→CRLF normalization in the modified test, not a diff error).
- Diff self-review: no business handlers, routes, API, status, data, native config, dependencies or design changes. No probe logs remain in shipped source.

## Missing gates / risks

NOT_RUN after patch: repeated Home/Tasks/Profile transitions, Detail/Back, keyboard/dock behavior, status/navigation bars, native Operator/Reporter regression, release/cold-start behavior, Camera/Navigation checks. These require a working native session. Other-role preservation is covered only by JS/source tests, not native acceptance. No success claim, stage, commit, fetch/pull, branch change or push. Existing untracked artifacts preserved.

## Follow-up acceptance — 2026-11-21

Owner reopened the project and logged into Crew, then explicitly asked to inspect without reset. The historical blocked checkpoint above is retained; this follow-up supersedes its missing Crew transition evidence only.

- Base HEAD: 94c7f5a8e6b612dd4e1ef8c1d1f53445e326dce6. Same Pixel_6_Pro Android 14 emulator, 1440x3120px, density 560. No restart/reload/reset/logout, role switch, storage deletion or business mutation issued during acceptance.
- Mounted `ProviderInsetScreens` observed through Metro. Home SafeAreaScreen's View style contained top 41.42856979370117dp, left/right 0, matching 145px physical status bar. This direct style inspection was Home, not an active-Tasks-only component probe.
- Normal navigation exercised: Home → Tasks → Profile → Tasks; Tasks → Home → Tasks → Profile → Tasks; Tasks → Detail 60a04265 → Quay lại danh sách → Tasks; Tasks → Profile → Tasks → Home → Tasks → Profile → Tasks; Tasks → Sync → Tasks; Tasks → Detail 60a04265 → Android system Back → Tasks.
- All observed destination headers: brand top y188px, subtitle y267px, avatar y173px; status bar y0–145px. No overlap or double top inset observed. Dock bounds y2841 onward, gesture navigation below app content. No keyboard was opened.
- Real screenshots under `.cache/safearea-acceptance-20261121/`: `home-start.png`, `profile-1.png`, `tasks-from-profile-1.png`, `tasks-from-profile-2.png`, `detail.png`, `tasks-after-detail-back.png`, `sync.png`, `tasks-final-system-back.png`. Final Tasks screenshot visually inspected. Historical failure BEFORE remains `.cache/crew-industrial-premium-20261120/tasks-safearea-followup.png` (brand y43px).
- Conclusion: scoped Crew Android transition/header acceptance passed in this development session (ANDROID_E2E_VERIFIED for the listed flows). The patch uses current provider insets in the same React layout as content, bypassing the previously measured native-padding mismatch. Exact native/Fabric attach race remains UNPROVEN; no claim that the underlying native library is repaired.
- Final `npx tsc --noEmit`: exit 0. Targeted safe-area/role/navigation suite: 128/128 PASS, `.cache/push-20261121-targeted.log`. Full regression: 1957/1957 PASS, exit 0, `.cache/safearea-acceptance-20261121/full-regression.log`; includes separately documented test-only Operator fixture clock correction. `git diff --check`: exit 0.
- Self-review: source diff limited to Crew opt-in wrapper and SafeAreaScreen presentation; other roles retain native SafeAreaView, no bottom inset ownership change. Harness assertions retained; new contract tests cover dynamic/zero insets and role/platform isolation. No API, params, Back handler, data/workflow, media/offline/journal, dependencies or app config edits.
- NOT_VERIFIED: keyboard behavior, native Operator/Reporter or iOS, Camera/Navigation, cold start and release APK. Those limits are not inferred PASS from JS tests. Existing untracked artifacts preserved. Commit and push authorized by owner after gates; final SHA reported in delivery.
