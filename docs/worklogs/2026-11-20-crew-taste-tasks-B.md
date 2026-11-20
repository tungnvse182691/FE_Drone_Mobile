# Crew Công việc — Taste pilot B

Date: 20/11/2026. Mode: IMPLEMENT_AND_SELF_REVIEW, Codex. Owner approved concept B and explicitly allowed tasks.tsx plus presentation tests while preserving existing Safe Area/skill WIP. This is one screen only; no permission to redesign other routes.

## Source and scope

Started on main at d43e2eb116513547cfb6f93d823aa2b3cc57de53. Local checkpoint commit contains this log, app/(crew)/tasks.tsx and tests/crew-taste-tasks-presentation.test.cjs only. Commit SHA is supplied in the handoff (this log is part of that commit).

Applied .agents/skills/redesign-existing-projects/SKILL.md, approved proposal/preview B, RoadGuard/code-review and mobile design guidance. Taste upstream pinned e04409a461022e1b9d0e898eac6b9224e2b9dc4e, subordinate to owner/canonical/design tokens. No dependency/font/config/global token change.

## UI changes

- Tasks-only inbox presentation: continuous screen surface, heading/scope, gold-tinted 48dp refresh, timestamp and Tải thêm row with wrap, quiet divider. Default inbox presentation remains framed for Home/task boundaries.
- Completion segment uses a neutral rail and navy selection without an outer outline. Four mode filters and labels remain; inactive chip borders are quieter.
- Task cards use 16dp corners, clear ID/status/content hierarchy and a continuous light-gray deadline footer. All optional route/section/chainage, distance, defect/batch and blocked-task messages retained.
- Existing ripple/spring/Reduce Motion implementation retained. No new animation; handlers are not delayed.

Read/query hooks, task boundary, mode mappings, filtering/counting code compare byte-for-byte (normalized newline) with HEAD. Reviewed JSX diff: all navigation, callbacks, params, permission/disabled predicates, status and data expressions unchanged. No business/API/offline/journal/media changes.

## Android evidence — actual screenshots, not concepts

Device: current local Pixel_6_Pro emulator, emulator-5554, Android API34, Expo Go, 1440x3120. No restart/reload/logout/mutation was issued. Source was applied by development Fast Refresh; transient Refreshing banner observed and excluded from final visual evidence.

Artifacts under .cache/crew-taste-tasks-implement/:

- tasks-before.png: actual pre-edit Tasks, active 46/done 4, task 60a04265 and 970f90aa.
- pagination.png: actual B after, same viewport/tasks/counts, later real loaded timestamp; final stable presentation before pagination busy state. Primary AFTER for comparison.
- tasks-after-done.png: completed tab, long real fixture titles wrap without truncation.
- detail-readonly.png: opened task 60a04265 from card and confirmed matching ID/title on Detail.
- tasks-scroll.png: scrolling reveals third task 89e9b452 above dock, header remains fixed.
- home-isolation.png: Home retains accepted navy KPI B and framed inbox default.
- tasks-after.png: active tab during read refetch, loading indicator/disabled Tải thêm visible; not the primary stable AFTER.

ANDROID_E2E_VERIFIED (bounded): completion tabs; all four mode filters on completed subset (conditional fast-track empty state, measure-only returns matching item); return to all/active; task 60a04265 → matching Detail → Quay lại danh sách → Tasks; Home → Tasks; scroll up/down; read loading and disabled controls. Real runtime counts remain 46/4 before pagination, never hardcoded. Tải thêm was tapped and its busy/disabled state observed; pagination completed: loaded active count increased from 46 to 71, done remained 4, and Tải thêm disappeared at the loaded end. Screenshot tasks-after-loaded.png records the actual resulting data. No mutation performed.

Native navigation had visible asynchronous delay; observations were re-read after transitions. No claim that this presentation work fixes existing navigation or Safe Area WIP. Header correctly below status bar during these bounded observations only.

NOT_VERIFIED: physical phone/iOS, narrow device/font-scale changes, TalkBack, device Reduce Motion toggle, native network failure/offline/foreign-owner scenarios. Error/stale/empty/pending branches and callback wiring verified in isolated Node harness, not native. No API mutation or FastTrack workflow executed.

## Executed verification

- npx tsc --noEmit: exit 0, run before and after final source changes; typecheck.log.
- node --test tests/crew-taste-tasks-presentation.test.cjs tests/crew-polish-layout.test.cjs tests/dot-c-crew-filter.test.cjs tests/crew-home-task-press.test.cjs tests/crew-header-refresh.test.cjs tests/crew-task-status-ui.test.cjs: 16/16 pass; targeted.log. Covers opt-in isolation, handlers, loading/pagination, stale/error/empty, mode filtering, ownership protection, wrap/48dp and existing motion preference behavior. LOGIC_TESTED, not native proof.
- node --test --test-concurrency=2 tests/*.test.cjs: 1955/1956 pass; full-regression.log. Started with two new presentation tests; the additional stale/error/empty test was subsequently run in targeted suite above. Full regression is NOT ALL PASS.
- Existing failure: tests/package6-drone-journal.test.cjs:375, Operator persists URL admission before POST and renews an expired admission with a new key; expected generation1, actual2. Same preexisting expired-URL fixture failure as historical baseline. Reads Operator journal/upload modules, does not import Crew Tasks. Re-ran independently with node --test --test-name-pattern='Operator persists URL admission' tests/package6-drone-journal.test.cjs: same failure; baseline-url-fixture.log. No unrelated test/fixture fix.
- git diff --check: no whitespace errors (existing WIP LF/CRLF notices only).
- Icon scan app/src: no Ionicons. Scoped scan: no financial/forbidden technology strings introduced. Self-review of routing/roles/defect labels/brand/contracts/error handling: unchanged expressions and guards, no new capability.

## WIP preservation / Git

SHA256 comparison against wip-hashes.json confirms all five protected files unchanged: .agents/skills/SOURCES.md, app/(crew)/_layout.tsx, src/components/SafeAreaScreen.tsx, tests/crew-nav01.test.cjs, tests/t05b.test.cjs. No staged WIP. All preexisting untracked/cache/database/log files preserved. Artifacts/tests may add their own isolated test cache as usual; no cleanup issued.

Remain on main. No push, fetch/pull, branch change, reset/clean/stash or data deletion. Safe Area remains a separate unaccepted checkpoint. Scoped UI/typecheck/targeted gates pass; full regression retains the documented unrelated baseline failure. Stop after this pilot for owner visual review.
