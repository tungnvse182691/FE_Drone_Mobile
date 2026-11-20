# Crew Industrial Premium — 20/11/2026

## Scope / authority

Codex `IMPLEMENT_AND_SELF_REVIEW`, owner task FULL 14 ROUTE UI CONSISTENCY. Start `main`, `4c8bd6583c81cb07dc3a6fe1560c757eac60d280`; tracked clean. No fetch/pull/push/branch changes. Existing untracked cache/log/db/build retained. Operator, BE, global tokens/config/dependencies excluded. No mutation or session reset to stage evidence.

Read: AGENTS, roadguard/code-review, DESIGN, pinned mobile-design (craft floor), vercel-react-native-skills, Expo building-native-ui/animations, Premium spec and Crew/Operator worklogs, Crew matrix/FastTrack policy. Server eligibility remains authority; submitted is not completion.

## Baseline and sequence

Evidence root `.cache/crew-industrial-premium-20261120/`. Native = currently running emulator-5554, 1440×3120, Expo Go, Crew sandbox. Historical images are references only. Audit below records initial reachability, not final acceptance. Native evidence for later checkpoints is added as reached safely. Never create blank drafts or submit existing old-session drafts.

| Checkpoint / route | Initial evidence / path | Findings / intended presentation |
|---|---|---|
| A Home | ANDROID_VIEWED, bottom Home, `home-before.png` | Disconnected greeting; tall white KPIs; competing fullwidth actions; ID below title/status. Navy actor + exactly two real KPIs; compact actions; task identity near title. |
| B Tasks | ANDROID_VIEWED, bottom Công việc, `tasks-before.png` | Tall inbox; broad filter pills; bottom ID; repeated borders. Compact controls, clearer selected state, identity at top. |
| C Detail | ANDROID_VIEWED, task 60a04265, `detail-before.png` | Cream/borders repeated; icons on data; fragmented facts/actions. Group overview, quieter facts, preserve all mode branches. |
| D Receiving | ANDROID_VIEWED, Home Nhận việc, `receiving-before.png` | Project/help space; row icons on every fact; UUID detail dense. Clear project/request hierarchy; label/value, no ACK during tests. |
| E Progress | CODE_ONLY, Detail repair branch → progress, NormalRepairPanel | Cream summary; same weight for identity/state; several repair subpanels. Refine summary and timeline presentation; live repair data needed for native. |
| F Complete | CODE_ONLY, Detail repair branch → complete, NormalRepairPanel | Same summary/card treatment; metadata lacks hierarchy; AFTER gates must remain. Group evidence/closeout, keep all conditions. |
| G Correction | CODE_ONLY, Detail → repair-correction | Status/history/technical IDs compete; repeated cream disclosures; long IDs. Separate management result from local receipt; selectable original IDs. |
| H Defect | ANDROID_VIEWED, Detail defect link, `defect-before.png` | Banner + several equal cards; title/ID separation; gold Back competes with evidence. Group read-only facts/evidence and demote Back. |
| I Field review | ANDROID_VIEWED, Detail submitted file, `field-before.png` | Old-session warning; cream stack; long title; lazy image placeholders. Group current/server/history, preserve policy guide and lazy-load labels. |
| J Camera | CODE_ONLY, field photo action, ViewFinder | Watermark icons repeated; blocked/loading typography and spacing; purpose controls must stay clear. Native blocked branch only if safely reachable; no photo capture. |
| K Map | CODE_ONLY, Detail map action, CrewTaskMap | Repeated outlined controls; context lacks identity; state panel competes with viewport. Quiet controls/context, preserve map and Back fix. |
| L Navigation | CODE_ONLY, Detail directions | Gold outlined floating controls; heavy sheet; repeated coordinate icons. Compact context and Google Maps action, keep real coordinates. |
| M Sync | ANDROID_VIEWED in today's reviewer baseline; fresh capture pending | Draft/queue hierarchy; old-session notices; repeated technical controls. Separate device drafts and command outcomes, no replay. |
| N Profile | ANDROID_VIEWED in today's reviewer baseline; fresh capture pending | Large avatar/centered metadata; equal cards; loose menu spacing. Compact identity, clear loaded stats and settings. |

Safety modal: source/worklog baseline; done/pending/blocked/error only from real state, no API153/154/155 mutations. Native not yet inspected this execution.

Plan: A→N separately scoped commits (E/F may share dependent presentation). At each checkpoint inspect exact source/callers, before/after native where safe, typecheck + targeted, diff guard review, worklog and exact-path commit. Full regression periodically/final. Narrow/fontScale/OS Reduce Motion changes are not authorized environment changes; record native NOT_VERIFIED and use existing automated coverage.

## A — Home — verified presentation checkpoint

- File `app/(crew)/home.tsx` only: navy actor overview, two equal KPI cells and loaded-scope note; two wrapping quick actions; task ID/status moved together above title; decorative badge/location icons removed. Existing ripple/spring helpers retained, no new entrance loop.
- Same count expressions, fetch states, task order, routes/params/disabled predicates and handlers. No service/store/hook edits.
- `npx tsc --noEmit`: exit 0. Targeted Home layout/motion/press/status: 14/14 pass (log `home-targeted.log`). `git diff --check`: pass.
- Android Home→Receiving via original action verified, no ACK. Stable final screenshot `home-after.png` inspected after Fast Refresh; Receiving header Back returns Home. Capture quick action opens task selection (no capture/mutation).
- Full regression: 1949/1950 pass. Sole failure `package6-drone-journal.test.cjs:375`, expired URL admission fixture, generation 2 vs expected 1. Matches owner-provided baseline; unrelated Operator runtime/test left unchanged. Log `full-regression.log`.
- Native loading/empty/error, narrow/font scaling, OS Reduce Motion: NOT_VERIFIED. Existing motion tests cover preference changes and immediate handlers, not native FPS.

## B — Công việc / inbox shared with Home

- A committed `03303ea`. B file `app/(crew)/tasks.tsx`: ID and original after-repair suffix beside status, 16/24 task title; navy selected completion tab, quiet rectangular mode filters; redundant assignment/location/time decoration removed. Shared inbox heading uses neutral surface, cream refresh/load-more and less footer padding; all content retained.
- Baseline `tasks-before.png`; stable `tasks-after.png` visually inspected. Android active→done shows four completed tasks, submitted remains in active; done→active tested. Existing press/ripple and content transition unchanged. Filters/count predicates/paging/hooks/handlers/route params unchanged in source diff.
- `npx tsc --noEmit`: exit 0; Home/layout/motion/press/status + dot-c filters: 17/17 (`tasks-targeted.log`); `git diff --check`: pass. Global full regression baseline remains 1949/1950 (unrelated expired Operator fixture).
- Native loading/error/offline, large text, narrow width and OS Reduce Motion NOT_VERIFIED; no settings changed, mutation or session restart.

## C — Chi tiết nhiệm vụ

- B committed `2117589`. File `app/(crew)/wo-detail.tsx`: merged identity/status/action overview, neutral surfaces, 16/24 title, compact ID, label/value facts without decorative date/location icons. Same expressions, conditions, callbacks and route params.
- ANDROID_VIEWED task 60a04265, read-only submitted MEASURE_ONLY. Before `detail-before.png`; final `detail-after-stable.png`; expanded technical `detail-technical-after.png`. Scroll and technical disclosure inspected; Back to list tapped. Original `detail-after.png` is pre-refresh, not final acceptance; retained as artifact.
- `npx tsc --noEmit` exit 0; detail/status/repair/reassessment presentation tests 16/16; `git diff --check` pass. Native other modes/loading/error, large font and Reduce Motion NOT_VERIFIED. No mutation, restart or settings changes.
