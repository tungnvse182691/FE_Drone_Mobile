# Crew Công việc v2 — 2026-11-23

## Gate 0 / authority

- Fresh local main and `git ls-remote origin main`: `91fbb16b2c61b87add2cb06cf30f06295dbaca0d`, subject `ui(crew): refine task list hierarchy and disclose metadata`.
- Checked again immediately before delivery: remote main unchanged. No fetch/pull/merge/branch switch/push.
- Owner prompt: attachment `7ea31082-0115-4baa-95db-eeab010cbfdc/Pasted text.txt`; approved main/filter v2 images supplied in this chat. Latest instruction: follow those references.
- Mode: **IMPLEMENT_AND_SELF_REVIEW**, Codex. No independent-review claim.
- Applied project roadguard/code-review, DESIGN/tokens, mobile-design, React Native guidance and Expo building-native-ui/animation references. Verification-before-completion read before delivery.
- Initial tracked tree clean. Existing untracked cache/log/database/native build files preserved.

## Scope and implementation

- `app/(crew)/tasks.tsx`: screen presentation only; existing 11 shared exported declarations compared against baseline with TypeScript AST and normalized line endings, all unchanged (including inbox/identity/boundary helpers used elsewhere).
- White three-column loaded-data summary, navy text/gold underline tabs with counts, search/funnel/refresh row fixed outside list scrolling. Summary is also fixed in this implementation; prompt does not require it to scroll.
- Reuses **already loaded unfiltered query cache** for the current actor/session/environment; no additional request for summary or task titles. Deduplicates assignments and excludes foreign owners. When absent, shows current loaded subset; unknown other-tab counts use `—`. These are not total server counts.
- Runtime screenshot shows 71 open / 75 loaded / 4 completed. Earlier in verification it showed 46 / 50 / 4; network had an unfiltered cursor fetch. Counts are runtime data, never hardcoded or made to match reference numbers.
- Presentation groups deadlines by Vietnam calendar: overdue, today, tomorrow, this week, plus later/no deadline so no task is dropped. Original deadlines and order within each group preserved.
- Flat task rows retain status, acceptance/time, title/fallback, route/location, defect/batch, distance, deadline and code. Neutral status text; no new red/blue status treatment.
- Codes use prefix + first eight characters + ellipsis; UUID fallback also shortened. Separate sibling copy button copies the original full value without opening Detail. Native copy/paste into search verified.
- Title remains `Nhiệm vụ hiện trường` where BE list summary lacks a title. Existing `task.title` takes priority when present. No detail fanout to invent a title: **BE_CONTRACT_GAP unchanged**.
- Bottom Modal contains both filter groups, immediate selection, reset and results. Rejected history retains tabs/search/filter and explanation. Native ripple; local controls do not animate their hit targets. Sheet slides when OS allows motion; unknown/reduced preference stays static, follows preference changes and cleans up its subscription. This motion is isolated to Tasks.
- Initial loading uses three skeleton rows; refresh retains old data. Stale/error/pagination behavior retained.
- No shared UI, layout, navigation, API, DTO, offline, journal, upload, dependency, config or token file changed. Existing card route/params/open permission checks preserved.

## Touch investigation — evidence and limits

- Dev-only touch/layout traces were added temporarily and removed before commit. Evidence in `.cache/crew-tasks-v2-20261123/touch-evidence.json`.
- Old inline selector trace: press-in 1795407569055 → touch 1795407569059 → press 1795407569072 (17 ms). No 300 ms hold requirement reproduced.
- Old inline filter expansion shifted mode/first-card targets by 406 physical pixels (mode y1164→1570; first card y1626→2032). This proves target movement, **not** every historical missed tap or a Reanimated root cause.
- Final funnel after scroll: press-in 1795408535156 → touch-start 1795408535167 → press 1795408535171 → touch-end 1795408535173 (15 ms to press). Correct sheet opened with one quick tap.
- Removed inline expanding filters from list and used isolated native Pressable controls for this screen. No shared CrewPressable change. No tap delay or timer added to handlers.
- Some navigation UI updates remained delayed on the emulator; checking after settling confirmed destinations. Cannot claim all historical intermittent/cancelled taps fixed or blame emulator/native hardware without proof. Physical-device touch remains NOT_VERIFIED.

## Android evidence (real screenshots, not concepts)

Device: Pixel 6 Pro, emulator-5554, Android 14, 1440×3120, Expo Go. Existing authenticated session retained. No restart/reload/logout or business mutation.

Artifacts under `.cache/crew-tasks-v2-20261123/`:

| Artifact | Evidence |
|---|---|
| `before.png` | Native BEFORE captured before editing |
| `after.png` | Default main view AFTER, runtime 71/75/4 |
| `filter-final.png` | Final bottom filter sheet after list scroll |
| `rejected.png` | Rejected history, controls retained |
| `search.png` | FIELD-1a6f returns one task |
| `detail.png` | Existing Detail, real title Sandbox Crew FIELD fixture |
| `scroll.png` | List scroll with fixed controls |
| `scroll-filter-verified.mp4` | 44.95-second native recording, list scroll and sheet opening; frame at 25 seconds inspected (`verified-video-frame.png`) |
| `scroll-filter-final.mp4` | Final native recording after adding OS-aware sheet motion, 19.49 seconds; scroll frame at 15s and sheet frame at 18s inspected (`final-video-frame.png`, `final-video-sheet.png`) |
| `touch-evidence.json` | Readable native states and temporary trace evidence |

Executed read-only interactions:

- Three tabs; Other empty state.
- All four acceptance choices and all four mode choices; reset/results and sheet close.
- MEASURE_ONLY changed overdue visible result count from 21 to 7 in that run; server-filtered list actually changed.
- REJECTED retained tabs, search, funnel and both filter groups; reset restores ALL/ALL.
- Search FIELD-1a6f; full original code copied then pasted into search, exact one-task match.
- Open FIELD Detail (ID 60a04265), existing Quay lại danh sách returns; no task mutation.
- Refresh, scroll (tabs y653 and search y866 remain fixed), Home → Sync → Profile → Tasks through unchanged bottom navigation, destinations checked after transitions settled.
- Left screen default Chưa hoàn thành / Tất cả tiếp nhận / Tất cả, search empty.

NOT_VERIFIED: physical device, narrow window/large system font, OS Reduce Motion toggle, live initial-load skeleton and forced network error/offline state. Skeleton/error/ownership branches verified in Node presentation tests only. No storage/session restart test because this task forbids restarting. No new authority over native/session/receipt workflows inferred from UI tests.

## Verification

- `npx tsc --noEmit`: exit 0, final log `tsc-delivery.log` empty.
- Targeted: `node --test tests/crew-flow-recovery.test.cjs tests/crew-polish-layout.test.cjs tests/dot-c-crew-filter.test.cjs tests/crew-tasks-v2.test.cjs tests/crew-taste-tasks-presentation.test.cjs tests/crew-home-task-press.test.cjs`: **65/65 PASS**, `targeted-delivery.log`, including motion preference/change/cleanup test. Earlier run 64/64 before that test.
- Full: `node --test --test-concurrency=2 tests/*.test.cjs`: final **1989/1989 PASS**, 0 failed/skipped, exit 0, `full-final-motion.log` (191092.2159 ms). Earlier pre-motion run 1988/1988 (`full-delivery.log`).
- First full run found three obsolete presentation assertions; updated their checks for approved code preview/copy and new styles while retaining recovery/ownership/native-target assertions. No business behavior expectation removed. New tests cover Vietnam grouping/no data loss, original-code preservation, cache actor/session/environment scoping and deduplication, rejected controls, sheet reset, skeleton, refresh/pagination and copy without navigation. Helper tests were red before implementation.
- Shared-export AST comparison: all 11 existing exported declarations unchanged after line-ending normalization. Added-diff privacy/secret, MaterialIcons/UD-06 scans clean; temporary touch instrumentation absent. `git diff --check` exit 0 (only CRLF normalization advisory).
- Evidence labels: LOGIC_TESTED and ANDROID_E2E_VERIFIED only for interactions explicitly listed. No mutation or complete native reliability PASS claimed.

## Presentation debt / delivery

- Approved local palette debt: #192D40, #5A6470, #6E7A85, #EDF1F4, #89939F, #D8DEE3, plus neutral alpha ripple/scrim. Existing tokens reused where equivalent; no global token changed.
- Public React Native Clipboard API works in current native binary but emits a deprecation warning. No clipboard package added; migration requires separate dependency approval.
- Files: tasks.tsx; tests/crew-tasks-v2.test.cjs; tests/dot-c-crew-filter.test.cjs; tests/crew-polish-layout.test.cjs; tests/crew-flow-recovery.test.cjs; this worklog.
- Checkpoint SHA: see local commit containing this file (`git log -1 -- docs/worklogs/2026-11-23-crew-tasks-v2.md`). Local commit only; owner controls push. Existing untracked artifacts retained.
