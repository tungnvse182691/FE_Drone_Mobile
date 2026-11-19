# Operator UI/UX consistency — 2026-11-19

## Mode and baseline

- Codex: IMPLEMENT_AND_SELF_REVIEW; no independent review claimed.
- Branch main; baseline b8a2772. No branch change, fetch, pull or push.
- Initial tracked tree clean. Existing untracked cache, logs, native build output and mydatabase.db preserved.
- Owner approved a warm overview grouping greeting, KPI and page-scope note; separate task code/status hierarchy and press feedback.
- Subsequent owner corrections: three visibly separated KPI columns; greeting slightly larger.

## Checkpoint 1: Home and shared task presentation

### Changes

- `app/(drone)/home.tsx`: cream overview, three centered KPI columns with thin separators; greeting 18 instead of inherited 16, weight 500 and line height 26; framed light gold See all action.
- `src/components/drone/OperatorTaskRow.tsx`: code badge above title, segment count alongside code, neutral border instead of thick status rail. Existing status icon, dot and label retained.
- Task press feedback uses existing AnimatedPressable: scale 0.985 and opacity timing, 150 ms. Existing Reduce Motion handling retained; no handler delay or looping motion.
- Shared row also renders on requests. That route's original native baseline was not captured before this shared change; Home BEFORE records the original row.
- Tests in operator-ui05, operator-ui06-crew and operator-ui-integration adapted for the actual AnimatedPressable wrapper and intended neutral border. Status, count, route and callback assertions retained.
- No API, task computation, query, session, route target/params, workflow or upload/recovery change. Home still uses first loaded page and first five task rows.

### Evidence

- BEFORE: `.cache/operator-uiux-20261119/home-before.png`.
- AFTER: `.cache/operator-uiux-20261119/home-after.png` (includes separated columns and 18 greeting).
- Android: Pixel_6_Pro / emulator-5554, Android 14, Expo Go, same Operator session. Native Home observed, task 25324063 opened and Android Back returned to Home. No restart/reload executed.
- Native KPI remained 50 loaded / 11 ongoing / 23 submitted. Screenshot confirms presentation only; not a fresh HTTP verification claim.
- `npx tsc --noEmit`: exit 0.
- Targeted command: `node --test --test-concurrency=2 tests/drone-ui02a.test.cjs tests/drone-ui02b.test.cjs tests/operator-refresh-ui.test.cjs tests/operator-ui05.test.cjs tests/operator-ui06-crew.test.cjs tests/operator-ui-integration.test.cjs tests/package45-drone.test.cjs`.
- Initial targeted run: 79/82; restored original KPI font size 28 and supplied presentation-wrapper mocks. Final run: 109/109 PASS; repeated checkpoint log: `.cache/operator-uiux-20261119/home-targeted-checkpoint.log`.
- `git diff --check`: PASS. Changed source scan for non-Material icon imports, prohibited monetary copy and obvious secret literals: no matches. Manual diff confirms business computation/handlers unchanged.

### Limits and remaining work

- Full regression: NOT_RUN in this checkpoint; required at end of Operator task.
- Native scroll, See all round trip, OS font scaling, OS Reduce Motion, offline/error/empty and FPS measurement: NOT_VERIFIED. Earlier swipe did not visibly move content and is not counted as PASS.
- Request list onward still requires route-specific native audit, before/after, implementation and verification.
- Commit identifies this checkpoint by subject `ui(operator): group home overview and refine task cards`; SHA is available from Git history (worklog included in that commit).

## Route matrix

| Route | Status |
| --- | --- |
| home | Presentation implemented; checkpoint native limits above |
| requests | Toolbar/filter/pagination presentation implemented; native limits below |
| request-detail | Presentation implemented; read-only native checks, mutation/playback limits below |
| request-decline | Pending |
| work-package | Pending |
| survey-map | Pending; no basemap/provider change authorized |
| upload | Pending; no upload mutations authorized for screenshots |
| sync | Pending; refresh must remain read only |
| log | Pending |
| profile | Pending |

## Checkpoint 2: owner-selected tonal KPI tiles

- Baseline 5a76790. Owner selected the separate three-tile mock on 19 November; supersedes the rejected divider design in checkpoint 1.
- Home only: remove enclosing cream panel and all KPI rules; use separate neutral / cream / green tiles with 8dp gaps, 12dp corners, left-aligned contents and minimum height 132dp. Real counts, page note and handlers unchanged. No new animation on read-only metrics.
- BEFORE `.cache/operator-uiux-20261119/home-tiles-before.png`; AFTER `.cache/operator-uiux-20261119/home-tiles-after.png`, actual Android Expo Go, same session and values 50/11/23.
- Android: ADB swipe up moved to last Home task; swipe down returned to greeting; See all opened Nhiệm vụ khảo sát and showed loading. No restart/reload.
- Fresh `npx tsc --noEmit`: exit 0; `node --test --test-concurrency=2 tests/operator-ui05.test.cjs tests/operator-ui-integration.test.cjs`: 18/18 PASS (home-tiles-tests.log); `git diff --check`: PASS.
- OS font scaling and OS Reduce Motion NOT_VERIFIED; full regression deferred to final Operator checkpoint. Commit subject `ui(operator): apply approved tonal home metrics`.

## Checkpoint 3: survey task list

- Previous checkpoints: 5a76790 (initial Home/shared row), 01d7782 (approved Home tiles). Baseline for this checkpoint: 01d7782.
- `app/(drone)/requests.tsx` only: neutral filter/menu outlines, cream framed refresh/history actions, 8dp toolbar gaps, existing AnimatedPressable press feedback/ripple with existing Reduce Motion path, centered rounded load-more action. No filter/count/pagination/route/API/handler changes.
- BEFORE requests-before.png (closed) and requests-filter-before.png; AFTER requests-after.png (closed) and requests-filter-after.png. All under `.cache/operator-uiux-20261119/`, same Android emulator/session. Shared row already changed in checkpoint 1 before these list baselines.
- Android: expanded filter; selected ongoing => 11 of 50; refreshed with same result; reopened and returned to all states. Native busy frame was too brief to assert; targeted test verifies busy/disabled with retained tasks. No restart or mutation.
- `npx tsc --noEmit`: exit 0. `node --test --test-concurrency=2 tests/operator-ui05.test.cjs tests/operator-ui-integration.test.cjs tests/operator-refresh-ui.test.cjs`: 31/31 PASS (requests-targeted.log). `git diff --check`: PASS. Manual diff: unchanged callbacks, business conditions and text/data.
- Native load-more reachability/press, empty/error, OS font scaling/Reduce Motion, FPS: NOT_VERIFIED. Full regression pending final checkpoint. Commit subject: `ui(operator): refine survey list controls and pagination`.
- Checkpoint commit b2db2b8. Broader follow-up found UI02A tap helper hardcoded Pressable; adapt to accept existing AnimatedPressable too, without changing behavioral assertions. Re-executed UI02A/video/detail-focus: 57/57 PASS. Correction committed separately by subject `test(operator): recognize animated survey controls`.

## Checkpoint 4: task detail and submitted-video presentation

- Baseline after list test follow-up: 84bef25. Changed `app/(drone)/request-detail.tsx`, `src/components/drone/OperatorSubmittedVideos.tsx`.
- Replace repeated gold card borders with neutral boundaries; code becomes cream badge, title 18/26, softer deadline label. Work-package action cream; video read button content-sized with cream surface. Technical disclosure uses existing AnimatedPressable/Reduce Motion behavior. Preserve status conditions, all calls, route params, player/download/source/lease lifecycle and handlers.
- Android BEFORE detail-before.png / AFTER detail-after.png under `.cache/operator-uiux-20261119/`, task 25324063, same session. Read video list => real 'Lần nộp 1 · 8/11/2026'; navigated to work-package, Android Back returned; scrolled to technical controls and opened technical disclosure. No submit/accept/decline/upload/replay or restart.
- `npx tsc --noEmit`: exit 0. First broad targeted run 55/56 (list wrapper test failure fixed separately in 84bef25). Follow-up `node --test --test-concurrency=2 tests/drone-ui02a.test.cjs tests/operator-video-playback.test.cjs tests/operator-detail-focus.test.cjs`: 57/57 PASS; earlier other detail/package/UI tests green. `git diff --check`: PASS. Manual diff: presentation only.
- Playback on actual video, mutation UI receipts, OS accessibility settings/FPS, offline/error native: NOT_VERIFIED. Video list read does not prove video playback or fresh HTTP receipt validation. Commit subject `ui(operator): clarify task detail and video section`.

## Checkpoint 5: work-package

- Previous detail commit: 62717eb. Work-package only: neutral scope border, cream code badge, fewer row dividers, map entry minimum 56dp instead of 76dp, cream map icon. Existing AnimatedPressable/Reduce Motion for map and disclosures; same handlers/params/content.
- Android: work-package-before.png / work-package-after.png; opened first segment (work-package-segment-after.png: 0–100m), scrolled back and opened dedicated map. Same emulator/session; no mutations or restart. Native caught function-style AnimatedPressable losing row layout; replaced that presentation style with static mapEntry before final evidence.
- tsc exit 0. operator-map + drone-ui02c + package45-drone: 40/40 PASS (work-package-tests.log). diff --check PASS; manual diff UI only. OS font scaling/Reduce Motion/FPS and unavailable access-point native case NOT_VERIFIED.
- All image/log paths under .cache/operator-uiux-20261119. Full regression pending. Commit subject: ui(operator): refine pinned work package presentation.

## Checkpoint 6: survey-map controls

- Previous work-package commit 272bcad. Map chrome only: framed 48dp header actions, cream selected segment with readable 14sp label, neutral framed unavailable access notice. Existing AnimatedPressable press/reduce-motion path on header/segments. Map engine/provider, geometry selection, IDs, params, center and handlers unchanged.
- Android survey-map-before.png / survey-map-after.png, task 25324063. Switched from segment 2 to segment 1 (selected state changed), refreshed read-only; unavailable access remains disabled; Android Back to package. Basemap is absent in baseline and after; not repaired or claimed as verified. Native access-point focus unavailable on this fixture; verified in targeted logic tests only.
- tsc exit 0; operator-map + operator-navigation-ime: 18/18 PASS (survey-map-tests.log); diff --check PASS. OS Reduce Motion/font settings, offline map, engine lifecycle and FPS NOT_VERIFIED.
- Commit subject: ui(operator): align survey map controls.

## Checkpoint 7: local sync inventory

- Previous map commit da78c86. Sync summary/read button is compact cream, neutral borders on inventory/recovery groups, cream upload ID badges and history controls. Shared recovery components are also used by upload/log; no status mapping, loading, scope, handler or route change. Existing press highlights retained.
- Android sync-before.png / sync-after.png under .cache/operator-uiux-20261119. Same local inventory: two verified files with dataset submission unconfirmed, 20 history entries, one task with unknown outcome. Read queue displayed explicit local-only/no-send notice; dismissed notice. No recovery replay or mutation.
- npx tsc --noEmit exit 0; drone-ui02c + operator-refresh-ui + operator-upload-recovery: 27/27 PASS (sync-tests.log). diff --check PASS. Manual self-review presentation-only.
- Queue tabs absent on this native fixture; populated queue and error states covered only by logic tests. OS accessibility settings, FPS, recovery mutation NOT_VERIFIED. Full regression pending. Commit subject ui(operator): refine local sync inventory presentation.

## Checkpoint 8: profile aligned with Crew (owner correction)

- Baseline 7ce6978. Owner explicitly requested the Crew profile design instead of the provisional horizontal cream identity panel. `app/(drone)/profile.tsx` now follows Crew's centered 80dp avatar/name, neutral role chip, settings heading, 64dp menu rows, neutral rounded settings group and lightly tinted red outline logout. Modal retains existing functionality with neutral borders and cream close control. Existing Operator content/employee-code condition, three actions, handlers, routes, auth and session logic unchanged; no Crew KPI/data/hooks added.
- Android original baseline profile-before.png; provisional before owner correction profile-owner-before.png; final profile-crew-aligned-after.png. Personal information opened; Android Back dismissed; queue row opened Sync with original inventory. No logout, password change or mutation pressed. Same session and emulator, Fast Refresh only.
- Fresh node --test --test-concurrency=2 tests/drone-ui02c.test.cjs: 14/14 PASS (profile-owner-tests.log); npx tsc --noEmit exit 0; git diff --check PASS. Source self-review: JSX/styles only. Existing ripple/pressed highlights retained; no new profile animation claimed.
- OS font scaling/Reduce Motion, long-name fixture and logout/password submission NOT_VERIFIED. Full regression remains pending. Commit subject: ui(operator): match profile presentation to Crew.

## Checkpoint 9: two-tab log and grouped lookup results

- Baseline e2e079a; owner approved removal of the duplicate Tasks tab/list. Final tabs: saved commands and lookup. Header Back uses existing AppHeader history behavior with requests fallback. Both tab panels stay mounted, retaining inputs/recovery; hidden content is excluded from accessibility traversal. Removed only the duplicate task-list read from Log; Requests remains unchanged.
- Files: app/(drone)/log.tsx, src/components/drone/DroneDatasetReadbackPanel.tsx and four targeted test files. Dataset compact styling is opt-in for Log. Existing read handlers, auth/session guards, response mapping, recovery, routes and API contracts unchanged.
- Owner result feedback: quiet grey result surface, server-source caption, medium-weight status and separated coverage. Existing CrewContentTransition presents returned content; tab presses use existing ripple/scale. No optimistic status or mutation added. Reduce Motion support uses existing components; OS setting not exercised.
- Android emulator-5554 / Pixel_6_Pro, Android 14, Expo Go, same Operator session; Fast Refresh only, no restart/reset/logout. Entered all three actual IDs and pressed their read controls. Task 25324063-5559-4c70-9283-d0ec321e09d6: submitted. Upload 9818a0d2-3197-4150-a603-1336f9359ae2: file verified. Dataset 1f53b477-7d42-47fb-af99-186b5a698eb3: integrity passed, GPS missing, coverage/position/quality unknown. These are independent server states, not completion/acceptance. Real GET responses were 200; Docker discovery used SELECT only, no data/config changes.
- BEFORE: owner D:/Screenshots/Screenshot_1795097054.png (bare result); log-tabs-before.png (long page). AFTER: log-task-result-after.png, log-upload-result-after.png, log-dataset-result-after.png, log-two-tabs-commands-after.png. Repo evidence root: .cache/operator-uiux-20261119/. Dataset final screenshot inspected; all three returned results observed on Android.
- npx tsc --noEmit: exit 0, log-results-final-tsc.log. Targeted node --test --test-concurrency=2 tests/operator-log-tabs.test.cjs tests/drone-ui02b.test.cjs tests/wave1-drone.test.cjs tests/package6-drone-recovery-ui.test.cjs tests/drone-android01-ui.test.cjs: 109/109 PASS, log-results-targeted.log. Full suite: node --test --test-concurrency=2 over tests/*.test.cjs: 1900/1900 PASS, log-results-regression.log (338158 ms). git diff --check: PASS. Separate mock repair commit 4ee9946 supplies StyleSheet.create to the existing video test harness.
- Self-review IMPLEMENT_AND_SELF_REVIEW only, no independent review claim. Manual source diff: unchanged lookup handlers and server mapping. Non-Material icon scan found no matches in app/src; changed presentation contains no cost, secret, mock server state or new wire fields.
- NOT_RUN: OS font scaling/Reduce Motion, measured FPS, native offline/error, final native tab-input retention roundtrip and Back fallback without history. Input retention/hidden panels tested in Node, not claimed native. Recovery mutations and upload actions not executed. Native checks stopped at owner request to move on promptly.
- Route matrix update: work-package checkpoint 5; survey-map checkpoint 6; sync checkpoint 7; profile checkpoint 8; Log checkpoint 9 implemented with limits above. Request-decline and upload native audit remain pending.
- Local checkpoint commit subject: ui(operator): simplify log tabs and group lookup results. Main retained; no push; untracked artifacts preserved.

## Checkpoint 10: decline task presentation

- Baseline 51887fe. Native observed task 7ad31d42, newly assigned. Quiet neutral task border, cream ID badge, reduced heading weight, remove repeated row rules, content-width framed return control. Styles only in app/(drone)/request-decline.tsx; handlers, conditions, command panel/journal and API untouched. Existing press feedback retained; no new motion claimed.
- Android BEFORE decline-before.png / AFTER decline-after.png under .cache/operator-uiux-20261119/, same emulator/session/task; both inspected. Empty reason correctly keeps save disabled and shows reason; return control pressed to task detail. No save/send/mutation or restart.
- npx tsc --noEmit exit 0 (decline-tsc.log). node --test --test-concurrency=2 tests/drone-ui02b.test.cjs tests/package45-drone.test.cjs tests/package6-drone-recovery-ui.test.cjs: 58/58 PASS (decline-tests.log). git diff --check PASS. Self-review: style-only diff.
- NOT_RUN: actual decline/save/confirmation, keyboard entry, native error/offline, OS font/Reduce Motion, FPS. Last full regression 1900/1900 was checkpoint 9, before this style-only patch. Owner requested prompt progress through remaining screens.
- Local commit subject ui(operator): soften decline task summary. Main retained, no push, existing untracked preserved.

## Checkpoint 11: survey upload presentation and owner-requested SRT card removal

- Baseline 4afeae2; IMPLEMENT_AND_SELF_REVIEW. app/(drone)/upload.tsx: medium headings, neutral framed 48dp header/refresh controls, cream pill file/draft/load-more controls and Android ripple. Owner requested removal of the optional GPS/SRT picker: removed its rendered card and SRT size caption only. API/payload, guards, journal, legacy draft/recovery and existing handlers unchanged. No BE edits.
- Contract check: local BE fe08de0 still declares TelemetryFileIds and Srt; service accepts an empty telemetry collection. Owner's statement that BE removed SRT is not established by this checkout (PRODUCT_SOURCE_GAP); the new-video picker no longer exposes SRT, without deleting historical files or changing wire contracts.
- Android Pixel_6_Pro/emulator-5554, same Expo Go session, no restart/reload. Baseline upload-before.png / upload-lower-before.png; final upload-after.png with SRT card absent, upload-lower-after.png from earlier disclosure audit. Saved-files empty disclosure observed before owner selected a video.
- Owner explicitly authorized actual submission of their selected video on task e2d68aea. Pressed Submit once with the owner's selected MP4, drone and recording date/time. Observed sending card then confirmed card: 'Da gui du lieu' / server received dataset, coverage assessed separately. Pressed read-result once: confirmed state retained. Screenshots upload-submit-result.png (sending) and upload-receipt-after.png (confirmed). ANDROID_E2E_VERIFIED for this submit/readback UI path; no raw HTTP receipt/status independently captured in this checkpoint, no PM acceptance/coverage claim.
- Evidence root .cache/operator-uiux-20261119/. npx tsc --noEmit exit 0 (upload-final-tsc.log). node --test --test-concurrency=2 tests/drone-ui02c.test.cjs tests/operator-upload-draft.test.cjs tests/operator-recording-time.test.cjs tests/package6-drone-recovery-ui.test.cjs: 55/55 PASS (upload-final-tests.log). Initial test failure depended on removed SRT picker; changed selector to video accessibility label, retained failure/logout assertions and added absence assertion. git diff --check PASS.
- Last full regression 1900/1900 PASS was checkpoint 9, before Decline/Upload presentation edits; not rerun. Native error/offline, OS Reduce Motion/font scaling, FPS, cancellation/retry and legacy telemetry draft recovery NOT_RUN. No animation performance claim. Untracked artifacts preserved; main retained, no push.
- All ten Operator routes in this audit now have presentation checkpoints; verification limits remain listed per checkpoint.

## Checkpoint 12: symmetric native video seek controls

- Baseline b2569b2; IMPLEMENT_AND_SELF_REVIEW. VideoPreview uses installed Expo Video player builder options: seekBackwardIncrement=5 and seekForwardIncrement=5. No player lifecycle, authorization, cache lease or API changes.
- Android same task e2d68aea/session/emulator: both controls visibly show 5; paused forward changed 00:00 to 00:05, rewind returned 00:00. BEFORE video-screen-before.png; AFTER video-seek-after.png under .cache/operator-uiux-20261119/. No reload/restart/mutation.
- Regression test first failed on missing builder options, then node --test tests/operator-video-playback.test.cjs: 17/17 PASS (video-seek-tests.log). npx tsc --noEmit exit 0 (video-seek-tsc.log). git diff --check PASS. Native iPhone and full suite for this checkpoint NOT_RUN.
- Main retained; no push; existing untracked preserved. Commit subject fix(operator): use five-second video seek in both directions.


## Checkpoint 13: dedicated compact video viewer and submitted-video presentation

- IMPLEMENT_AND_SELF_REVIEW; baseline 22828f8. Owner approved a separate viewer, then requested YouTube-like compact default and removal of cream controls obscuring fullscreen. Default is a contained 16:9 player; optional expanded mode keeps a dark 48dp control bar outside the video. Both modes use the same player/authorized lease; no autoplay or delayed business handler. No animated transition (Reduce Motion safe).
- Submitted-video section: neutral submission rows, cream selected row and play action, MaterialIcons, left alignment and grouped file note. Original list/select/play handlers and data retained. DTO provides index/size, not filename: viewer label uses those existing fields.
- Existing auth, session/focus/AppState invalidation, periodic authorized readback, cancellation, lease detach/disposal and temporary-file cleanup unchanged. Native Android fullscreen opens another Activity and triggers the existing background guard; use same-Modal expansion without bypassing that guard. No new dependency, route, API or BE modification.
- Android Pixel_6_Pro/emulator-5554 Android 14, Expo Go, task e2d68aea, actual 3.9 MB/00:53 video: loaded/opened, played visible frames, entered/exited expanded view, Android Back returned to same Detail. No restart/reload/logout or upload replay. Before: owner Screenshot_1795099407.png and clipboard-13616b3c screenshot. After under .cache/operator-uiux-20261119/: video-section-after.png, video-compact-playing.png, video-fullscreen-unobstructed.png. Clip itself contains old Crew UI; device remains Operator.
- npx tsc --noEmit exit 0 (video-viewer-tsc-final.log); targeted node --test --test-concurrency=2 tests/operator-video-viewer.test.cjs tests/operator-video-playback.test.cjs tests/a54c806-lifecycle.test.cjs tests/operator-ui06-crew.test.cjs: 57/57 PASS (video-viewer-targeted-final.log). Harness adds interval/AbortController globals to exercise real preview effects. Updated stale optional-SRT assertion to match owner-approved picker removal; first regression failure was that assertion.
- Full suite before final compact correction: 1906/1906 PASS, video-viewer-regression-final.log. Final full-suite result recorded below. Header close/session/blur/background cleanup tested with fixtures; native header-close, iPhone, font scaling, OS Reduce Motion, FPS and offline/error NOT_RUN. No native performance claim. Main retained, no push, untracked artifacts preserved.

- Final combined source verification: `npx tsc --noEmit` exit 0 (`final-owner-corrections-tsc.log`); `node --test --test-concurrency=2` over all `tests/*.test.cjs`: **1907/1907 PASS**, 237020 ms (`final-owner-corrections-regression.log`). Includes Crew disclosure correction. An intermediate run failed a malformed new receipt-selector assertion; selector corrected to inspect Text children arrays, then focused and final full suite passed. No runtime workaround was added for that test failure.
- Final selected-submission icon is check-circle-outline (not a collapse affordance); `video-section-after.png` predates only this icon correction. Final recapture NOT_RUN: hierarchy returned only system UI and adb screencap stalled; stopped the capture command without restarting app/emulator. Earlier native playback/expansion/Android Back evidence remains valid. Changed-source privacy/cost/icon scan and `git diff --check` passed. Self-review only.

## Checkpoint 14: owner iPhone safe-area correction

- Baseline 0dcc3c9. Owner screenshots clipboard-688a5c6e and clipboard-da794753 show time/battery covering the video viewer header. Modal used SafeAreaView without a local native SafeAreaProvider. Installed native source searches for nearest provider; the Modal requires its own measurement root. Added local provider without fixed notch/status-bar offsets. Reference: https://appandflow.github.io/react-native-safe-area-context/docs/api/safe-area-provider/.
- Moved expansion action to a separate flow row outside the player, with visible Phóng to/Thu nhỏ labels, 48dp minimum height and shrinking text. Header title can shrink independently; no absolute control overlays. Playback/session/API/lease handlers unchanged.
- Regression first failed on missing modal provider (`safe-area-red.log`); viewer/playback targeted 24/24 PASS (`safe-area-targeted.log`); npx tsc --noEmit exit 0. git diff --check PASS. Native iPhone correction NOT_RUN: owner device not connected. Android read/navigation continued without restart; final video proof pending. No claim of verification on every phone.
- Owner separately authorized expo-screen-orientation/config changes for video-only landscape; these remain a separate checkpoint. Main retained, no push, untracked preserved. Self-review only.

## Checkpoint 15: in-frame fullscreen and sensor-driven video orientation

- Baseline `6d5e8c8`, mode IMPLEMENT_AND_SELF_REVIEW, no independent reviewer. Owner explicitly authorized `expo-screen-orientation` and native orientation config, then clarified: expanding must NOT force landscape; physically rotating the phone changes orientation only while fullscreen. This supersedes the intermediate forced-landscape attempt (not committed).
- Files: OperatorSubmittedVideos.tsx, new videoOrientation.ts, app.json, package.json/lock, viewer/orientation tests and this log. Fullscreen icon moved inside the video frame at top right, 48x48dp touch target, dark translucent backing, MaterialIcons and named accessibility action. Native seek/play controls remain below/central. Default player stays compact 16:9; fullscreen uses available safe-area space. The existing same-player/lease key remains stable across expansion.
- Fullscreen requests OrientationLock.DEFAULT (sensor/system preference), NOT LANDSCAPE; compact/closing requests PORTRAIT_UP. Serialized native requests preserve portrait after close during an in-flight request; errors cannot poison the next request. Failed expansion falls back to compact view with a neutral visible message. No navigation/API/DTO/authorization/AppState/session/lease disposal change.
- Installed Expo-SDK-compatible `expo-screen-orientation ~58.0.4`. Lockfile limited to the new dependency/record, retaining unrelated peer records pruned by npm. Android manifest initial portrait remains unchanged. iPhone Info.plist now declares portrait/landscape left/right, video Modal declares the same; plugin initialOrientation PORTRAIT_UP keeps launch portrait. ios.requireFullScreen is enabled for orientation support on iPad (multitasking limitation; modern resizable iOS still requires separate validation). Native configuration needs a new binary; no build/restart/reload was performed.
- Official references: https://docs.expo.dev/versions/latest/sdk/screen-orientation/ and https://reactnative.dev/docs/modal.html (Modal supportedOrientations is also limited by Info.plist). mobile-design/React Native/Expo guidance applied within project rules.
- RED: orientation-red.log viewer assertion failed on missing supported orientations/frame. After owner clarification, sensor-red.log failed 2 queue expectations against forced-landscape implementation. GREEN: `node --test tests/operator-video-viewer.test.cjs tests/operator-video-orientation.test.cjs tests/operator-video-playback.test.cjs tests/a54c806-lifecycle.test.cjs` **34/34 PASS**, sensor-targeted.log. Tests cover queue ordering during rapid close, failed native request recovery, config, same download/lease during expansion and close/session/background/blur cleanup. These are LOGIC_TESTED, not native lifecycle proofs.
- `npx tsc --noEmit` exit 0 (sensor-tsc.log). `npx expo config --type introspect --json` exit 0: resolved iPhone supported orientations include portrait/left/right; initial mask is portrait; Android activity remains portrait with orientation/screenSize configChanges. Config artifact remains untracked in .cache.
- Android E2E: Pixel_6_Pro, Android 14, Expo Go, existing task 25324063/submission dated 8/11/2026, authorized read/download of existing 2-second clip. No upload/replay/submission/BE writes. Fresh foreground/size/hierarchy inspected before actions. Expanded while sensor upright: player remained portrait (1440x3120). Emulated physical sensor acceleration changed from 0:9.77631:0.812349 to 9.77631:0:0.812349: existing viewer became landscape (3120x1440), controls in bounds. Shrink while sensor sideways: returned compact portrait with same lease. Expanded/tilted again then Android BACK: viewer closed to same detail with selected video still available, portrait restored despite sideways sensor. Restored exact original sensor values afterward. No restart/reset/cache clearing.
- Native evidence in `.cache/operator-uiux-20261119/`: viewer-before-inframe.png; viewer-after-inframe-portrait.png; final viewer-sensor-full-portrait.png; viewer-sensor-full-landscape.png; viewer-sensor-shrink-portrait.png; viewer-sensor-back-portrait.png. Earlier viewer-after-inframe-landscape.png belongs to superseded forced-landscape attempt, not final sensor behavior. Mobile screen-size tool reports natural dimensions even landscape; actual hierarchy and PNG show landscape dimensions. Used adb input with freshly inspected integer coordinates when mobile tap tool rejected landscape coordinates.
- Native iPhone, fresh APK build, physical Android sensor, accessibility text sizes, iOS native control placement, real-device FPS and OS rotation-lock variations: NOT_RUN. Sensor behavior is proven on Android emulator only. No claim that all phones have been verified. Recent Metro error query returned no entries.
- Expo Doctor: **19/20**, version check failed on existing patch versions of expo (58.0.25 vs ~58.0.26), expo-file-system (58.0.13 vs ~58.0.14), expo-router (58.0.31 vs ~58.0.32), expo-sqlite (58.0.17 vs ~58.0.18). New orientation package is compatible. No unrelated upgrade/audit fix performed. npm install reported 3 moderate vulnerabilities; security remediation outside this task.

- Final verification after sensor correction: full suite node --test --test-concurrency=2 over tests/*.test.cjs: **1910/1910 PASS**, exit 0, 185836.8784 ms (sensor-regression.log). TypeScript exit 0 (sensor-tsc.log). Final scoped diff review: API/session/AppState/lease guards unchanged; app/src Ionicons scan and changed-source cost/secret/log scan returned no matches. git diff --check PASS. Self-review only; main at 6d5e8c8 before commit, fetched origin/main at 0206b84. No push; existing untracked preserved. Native/build limitations above remain open.
