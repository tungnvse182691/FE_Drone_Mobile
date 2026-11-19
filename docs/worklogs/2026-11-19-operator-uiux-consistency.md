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
