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

## A2 — Owner addendum: KPI option B

- C committed `b330999`. Only `app/(crew)/home.tsx`: two equal flexible navy-light KPI surfaces, left 3dp gold/mint accents, matching numbers, full pale labels. Original real counts/error placeholders unchanged. Wrap with 120dp minimum; no fixed text height, new icon or motion.
- Android before `home-kpi-b-before.png`, after `home-kpi-b-after.png`, visually inspected; actual values 46/4 unchanged. Existing inbox fetching indicator is independent of KPI polish.
- `npx tsc --noEmit` exit 0; Home/layout/press/motion/status 14/14 pass; `git diff --check` pass. Large OS font/narrow viewport/native Reduce Motion NOT_VERIFIED (settings unchanged). Source diff has only style and style selection.

## D — Tiếp nhận

- A2 committed `c8f7709`. Only receiving.tsx presentation: compact navy ID, neutral request surfaces, fewer repeated decorative icons; detail label/value wrap and selectable original UUID retained. Refresh remains 48dp. ACK predicates/callbacks untouched.
- Android before `receiving-before.png`; after `receiving-after-loading.png` inspected. Current discovery remains loading; populated rows/detail and ACK-disabled closed state after refresh NOT_VERIFIED. No ACK or mutation performed. Metro error log returned empty. This is partial native acceptance, not populated-state PASS.
- `npx tsc --noEmit` exit 0; `node --test tests/h01a.test.cjs tests/crew-nav01.test.cjs tests/crew-polish-layout.test.cjs tests/crew-polish-l10n.test.cjs` 72/72 pass. Final detail font size adjusted 16→14 presentation only. Diff check pass. Large font/narrow/Reduce Motion NOT_VERIFIED.

- Follow-up: discovery resolved naturally. `receiving-detail-after.png` actually shows populated list (despite filename), visually inspected with closed/acknowledged/unacknowledged statuses. Closed row tap had not opened detail at capture, so detail interaction remains NOT_VERIFIED.

## E — Theo dõi thi công

- D committed `7de974f`. Owner-authorized one project reopening used after frozen taps; Expo Go ANR Wait chosen, app recovered. No storage/cache reset or logout.
- Files progress.tsx and repair panel presentation in wo-detail.tsx: neutral identity summary, navy title/compact ID, quieter current-step panel/disclosure, consistent step spacing and tabular counters. Existing CrewPressable motion retained. No handlers, conditions or state expressions changed; shared panel callers remain Crew Detail/Progress/Complete only.
- Android task 9b840ab7 opened normally via Tasks conditional filter → Detail → Theo dõi thi công. Before `progress-before.png`, after `progress-after.png`, expanded `progress-steps-after.png`; opened/closed four-step disclosure. No start/assessment/finish/replay mutation. Existing prior-session warning remains.
- TypeScript exit 0; repair/reassessment presentation + polish layout 9/9 pass (`progress-targeted.log`); diff check pass. Other progress states, font/narrow/Reduce Motion and mutation paths NOT_VERIFIED. Full regression baseline unchanged (1949/1950, unrelated Operator expired fixture).
