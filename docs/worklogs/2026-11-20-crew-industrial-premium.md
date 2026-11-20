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

- E follow-up: header Back returned Detail for the same 9b840ab7 task. Source diff reviewed: styles + decorative construction/location icon removal only. Full regression baseline remains inherited 1949/1950; no native FPS claim.

## F — Hồ sơ hoàn tất thi công

- Files complete.tsx + closeout presentation in wo-detail.tsx. Neutral task summary, compact navy ID/title; removed location/photo decoration. Three original counts remain separate neutral cells; closeout spacing and borders align with Progress. Existing spring/ripple and Reduce Motion helpers retained.
- Android task 9b840ab7: opened from Detail; before `complete-before.png`, after `complete-after.png` visually inspected. Opened and closed “Chi tiết bản lưu”; original zero counts and “Chưa kết thúc thi công” guard retained. No capture/finish/submit. Other server states and narrow/font/Reduce Motion NOT_VERIFIED.
- `npx tsc --noEmit` explicit TSC_PASS exit 0. Repair/reassessment presentation + polish layout 9/9 pass. `git diff --check` pass; diff only styles/decorative icons. Full regression baseline 1949/1950; no new full run at this checkpoint.
- E source checkpoint eebddcd; b259499 adds verification notes only, not duplicate source changes. Owner confirmed no other writer; no reset/rewrite performed.

## G — Kết quả hồ sơ sửa chữa

- F committed 3f0daa7. repair-correction.tsx styles only: neutral summary/disclosure, navy 16/24 title, compact task ID, consistent 16dp spacing. Review decisions, receipt history, technical disclosure, recovery and supplement routes/guards unchanged. Original full IDs remain selectable under the existing disclosure.
- Android NORMAL task ebcdca88 via Detail: correction-before.png / correction-after.png inspected; empty review and empty local history shown truthfully. Disclosure opened/closed, no mutation. Accepted/pending/supplement populated native states, long technical IDs, font/narrow/Reduce Motion NOT_VERIFIED; existing mounted accepted/supplement tests pass.
- Explicit TypeScript TSC_EXIT=0; repair/reassessment presentation + polish layout 9/9; git diff --check pass. Existing ripple/spring retained; no FPS measurement. Full regression inherited 1949/1950, expired Operator fixture unrelated.

## H — Khuyết tật thuộc nhiệm vụ

- G committed f7306ff. report-defect.tsx: grouped classification and original instructions in one facts section, removed decorative place/category icons, compact navy identity/title and neutral summary. Back-to-detail changed visual variant only; original replace callback/params unchanged. Submitted evidence button and predicates unchanged.
- Android ebcdca88: defect-before-current.png / defect-after.png inspected; long title wraps, existing missing coordinate/classification states remain. Tapped submitted-evidence link, but arrival was not observed at that step: link arrival NOT_VERIFIED. Later Field Review was reached from Detail, not evidence of the Defect link. No mutation. Other data states, narrow/large text/Reduce Motion NOT_VERIFIED.
- Explicit TypeScript TSC_EXIT=0; defect evidence navigation + polish layout/l10n 15/15 pass; diff check pass. Global regression baseline unchanged; existing content/press helpers retained.

## I — Hồ sơ hiện trường

- H committed 3755fb7. field-review.tsx styles only: neutral overview, compact navy ID, navy 16/24 title, 16dp section padding, tabular measurement results and neutral lazy-photo frames. Existing policy guide/units, draft recovery, inputs, gallery, receipts, permissions and callbacks untouched.
- Android NORMAL submitted ebcdca88 reached from Detail: field-before-current.png / field-after.png / field-lower-after.png. Inspected long task title, old-session warning, missing measurements and lazy image label; scrolled lower and Back returned same task Detail. No draft creation/adoption/save/capture/send. Other modes/editors, large font/narrow/Reduce Motion NOT_VERIFIED.
- Explicit TypeScript TSC_EXIT=0; field UX/feedback/dimensions/instrument/policy/layout 64/64 pass. git diff --check pass; reviewed complete diff (StyleSheet only). Corrected H worklog evidence overclaim: Defect-link arrival was not observed, Field opened from Detail instead.

## K — Bản đồ nhiệm vụ

- File src/components/crew/CrewTaskMap.tsx: StyleSheet only, neutral canvas/footer/borders, navy 16/24 heading, quieter 48dp refresh and selection controls. Geometry, coordinates, callbacks, Back and fallback unchanged.
- Android screenshots taskmap-before.png / taskmap-after.png inspected for missing-position state. Follow-up taskmap-populated-after.png shows live map tiles and route/segment selector; defect location still truthfully missing. Header Back returned Detail; current observed identity after Back is ce40cb90 (SAU-02). Earlier inferred 60a04265 identity is not accepted as proof of same-task Back; exact identity before opening was not retained in this follow-up. No mutation/reload.
- TypeScript exit 0; map-back/map-geometry/hardening-map targeted 16/16 pass; git diff --check pass. No-history native fallback, segment selection, narrow/font scaling/Reduce Motion NOT_VERIFIED. Source diff contains styles only.

## M — Đồng bộ

- Files sync.tsx, CrewLocalDraftPanel.tsx, CrewOfflinePanel.tsx: navy 16/24 headings, neutral borders, compact task identity, grouped measurement/photo values, fewer decorative icons. Existing warning, receipt distinction, journal/recovery and all callbacks/conditions retained. Both panel callers are Crew Sync only.
- Android sync-before.png / sync-after-stable.png visually inspected; sync-after.png was captured before Fast Refresh and is not acceptance evidence. Scrolled to eight confirmed journal entries, real counts 8/0/8; opened technical disclosure, observed original native-provider limitation and read-log button, then tapped collapse. sync-lower-after.png captures expanded state. No replay/submit or old-session draft adoption.
- TypeScript exit 0; sync-empty-legacy/local-drafts/dot-b-sync-profile/layout/l10n tests 27/27 PASS (sync-targeted.log); git diff --check PASS. Full diff reviewed: presentation only. Loading/error/offline forcing, large fonts/narrow screen, Reduce Motion and actual mutation paths NOT_VERIFIED. Existing motion retained; no FPS claim.
- Owner reconfirmed there is no other writer. b259499 changes worklog only; no evidence of source overwrite. Earlier uncertain navigation arrival claims were corrected in H/K entries rather than reported as native PASS.

## N — Hồ sơ

- Only app/(crew)/profile.tsx presentation: avatar 64dp, navy 18/26 name and 16/24 section title, quieter role label without decorative build icon, three equal flexible neutral stat cells instead of vertical dividers, 28/36 tabular values. Original real 4/46/50 expressions, labels, colors, callbacks and settings remain unchanged. Existing CrewMotion retained; no new motion/FPS claim.
- Android profile-before-stable.png / profile-after-final.png visually inspected. Scrolled to settings/footer and back to top; opened personal-info alert and dismissed OK. Alert response was delayed; immediate responsiveness is not claimed. No logout/password action, mutation, reload or device-setting change. Large text/narrow width/Reduce Motion and all menu destinations NOT_VERIFIED.
- Intermittent safe-area observation: stable pre-edit baseline showed header overlapping system status bar; after Fast Refresh header is normal. No safe-area code changed, root cause unproven, NOT_FIXED by this presentation patch. Do not infer a fix from the after screenshot.
- npx tsc --noEmit explicit TSC_EXIT=0; dot-b-sync-profile + crew-polish-layout/l10n 20/20 PASS; git diff --check PASS. Complete profile source diff reviewed: JSX decoration and StyleSheet only.

## J / L — Safe-access limits, source unchanged

- J viewfinder.tsx CODE_ONLY / BLOCKED for fresh native baseline: Field Review camera action saves field measurements before navigating; repair AFTER action prepares/persists a repair claim before navigating. Home camera starts task selection. Under the owner's no-draft-write/no-mutation constraint these entry actions were not invoked. No camera guard bypass, direct-link substitute, capture, picker or new blank draft.
- L navigation.tsx CODE_ONLY / BLOCKED for fresh native baseline: normal Detail entry requires fresh.coordinates. Previously inspected native tasks did not expose that entry. No fabricated coordinates or deep link used to substitute normal access. Existing navigation spring is not Reduce Motion aware; unchanged and not claimed compliant by this task.
- Read-only source review preserves camera purpose/permission/session/draft lifecycle, taskId/projectId, Google Maps coordinates and Back fallback. node --test tests/crew-camera-lifecycle.test.cjs tests/crew-after-camera-guidance.test.cjs tests/dot-b-camera.test.cjs tests/crew-map-back.test.cjs tests/crew-map-geometry.test.cjs: 22/22 PASS, LOGIC_TESTED only; not native acceptance of J/L.

## Consolidated checkpoint index — owner review

Mode: Codex IMPLEMENT_AND_SELF_REVIEW, not independent review. All image names below are in `.cache/crew-industrial-premium-20261120/`; retained untracked. Native status means the observed state only, not all workflow branches. 12 routes have presentation commits; J/L remain source-reviewed and blocked for a fresh safe native baseline. Full 14-route native acceptance is not claimed.

| Route | Source checkpoint | Android before → after | Executed targeted tests | Native limit |
|---|---|---|---|---|
| A Home | 03303ea + c8f7709 | home-before.png → home-kpi-b-after.png | 14/14 | Real 46/4; font/narrow/Reduce Motion not verified |
| B Tasks | 2117589 | tasks-before.png → tasks-after.png | 17/17 | Active/done filters viewed; error/offline not forced |
| C Detail | b330999 | detail-before.png → detail-after-stable.png | 16/16 | Submitted MEASURE_ONLY; other modes not fully native tested |
| D Receiving | 7de974f | receiving-before.png → receiving-detail-after.png | 72/72 | Populated list viewed; request detail/ACK not verified |
| E Progress | eebddcd | progress-before.png → progress-after.png | 9/9 | Old-session state; disclosure and same-task Back observed; no mutation |
| F Complete | 3f0daa7 | complete-before.png → complete-after.png | 9/9 | Unstarted/zero counts; no finish/submit |
| G Correction | f7306ff | correction-before.png → correction-after.png | 9/9 | Empty review/history; populated decisions not verified |
| H Defect | 3755fb7 | defect-before-current.png → defect-after.png | 15/15 | Long title; evidence-link arrival not verified |
| I Field | 67cd4c8 | field-before-current.png → field-after.png | 64/64 | NORMAL submitted; no draft adoption/edit/save |
| J Camera | unchanged | No fresh native baseline | J/L source tests 22/22 | BLOCKED: entry saves draft/claim; no bypass |
| K Map | 76bd616 | taskmap-before.png → taskmap-after.png; taskmap-populated-after.png | 16/16 | Map/segment controls viewed; exact same-task Back not verified |
| L Navigation | unchanged | No fresh native baseline | J/L source tests 22/22 | BLOCKED: no coordinate-enabled normal entry found |
| M Sync | 6ab2996 | sync-before.png → sync-after-stable.png | 27/27 | Real 8/0/8, technical disclosure; no replay/submit |
| N Profile | 3a10277 | profile-before-stable.png → profile-after-final.png | 20/20 | Scroll/info alert observed; intermittent safe area remains unexplained |

- TypeScript was executed for each presentation checkpoint with exit 0; tests above are separate runs and overlap, so do not add their counts into a unique-test total. Existing CrewMotion retained; no newly implemented animation, measured FPS, or full native Reduce Motion verification claimed.
- Net source diff from 4c8bd65 reviewed across Crew routes and three Crew-only components: presentation JSX/decorative icons/style changes only. No API/state/handler/guard/formula/route-parameter changes found. Operator/Reporter/BE/global tokens/config/dependencies untouched.
- Follow-up observations outside this presentation scope: intermittent delayed navigation/touch; pre-edit Profile safe-area overlap; previously observed Field→Detail journal read/reconcile error. Causes unresolved; not represented as fixed by UI commits. Large-font/narrow-screen/native Reduce Motion and mutation branches remain NOT_VERIFIED.

### Final self-review execution — 20/11/2026

- Full command: `node --test --test-concurrency=2 tests/*.test.cjs`, final source checkpoint 3a10277 (Profile patch already present when run started). Exit 1, 1950 tests, 1949 pass, 1 fail, 503696ms. Log `.cache/crew-industrial-premium-20261120/full-regression-final-review.log`.
- Sole failure repeats baseline: tests/package6-drone-journal.test.cjs:375, “Operator persists URL admission before POST and renews an expired admission with a new key”, expected generation 1, actual 2. Scenario helper returns part URL expiry 2026-11-20T00:00:00Z at lines 317/320, already expired at execution. No changed Operator/test/upload files in net diff. This is an inherited failing gate, not a green full regression or an Android upload verification.
- Fresh final scope check: only 11 Crew route files, CrewTaskMap/CrewLocalDraftPanel/CrewOfflinePanel and this worklog differ from base 4c8bd65. task-map.tsx route itself unchanged; its visual component changed. J/L untouched. Global icon/UD-06 text scan in app/src returned no matches (rg exit 1 denotes no match). git diff --check passed; warning about LF→CRLF is a Git line-ending warning, not a test failure.
- Additional normal-route native check: tapped Công việc from Profile, observed actual Tasks arrival (60a04265/970f90aa rows). Header brand top y188 on Profile became y43 on Tasks while Android status bar occupies y0–145. Screenshot tasks-safearea-followup.png visually confirms overlap. This reproduces an unresolved inset issue across routes; no shared layout/header/navigation patch or restart was attempted. Full visual acceptance remains open until root cause is investigated separately.
- No push, fetch/pull, branch change, data/cache deletion or mutation performed in this review. Local commits preserved; owner confirmed sole writer. Documentation checkpoint follows the per-screen commits and does not claim 14/14 native PASS.
