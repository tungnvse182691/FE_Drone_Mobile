# Crew Tasks header refinement — 2026-11-23

Mode: IMPLEMENT_AND_SELF_REVIEW. Branch main; baseline 3e8275a (reason checkpoint after owner-observed 04be54e). Local checkpoint only, no push.

## Scope

- app/(crew)/tasks.tsx: unchanged AppHeader, then status selection, three independent KPI surfaces, real loaded-time caption, existing Search/Filter/Refresh, existing task list.
- Active selection uses existing local navy/white; inactive slate; no gold underline or separating tab borders. Minimum target 48dp, equal flex columns, wrapping text, no fixed tile height.
- Three KPI surfaces use tokens, radius 12dp, compact semantic accents, navy tabular numbers and no vertical dividers. Values remain loaded.length - completed, loaded.length, completed. Timestamp remains derived from existing asOf and Asia/Ho_Chi_Minh formatting. Loaded subset is explicitly labelled; no claim of BE total.
- Controls now belong to scroll content; only AppHeader stays fixed. Scrolling can reveal the list without a tall fixed dashboard covering group headings.
- Existing card JSX/styles, Bottom Sheet, queries, filters, count formulas, cursor/cache, handlers, navigation and permissions are unchanged. No Home/shared component/global token changes.
- tests/dot-c-crew-filter.test.cjs updates presentation expectations and checks order while retaining cache/session/filter coverage. tests/crew-polish-layout.test.cjs checks separate surfaces and flexible dimensions. Static style tests are not native font-scaling proof.

## Android executed

Existing Pixel_6_Pro / emulator-5554, Android 14, 1440x3120. No emulator restart/reset, logout, font/density changes, seed or business mutation.

- Actual screenshots: .cache/crew-tasks-header-20261123/before.png, after.png, completed.png, scroll.png.
- Before shows 46/50/4, 13:19. After shows 71/75/4, 13:22: the existing loaded cache gained another page during runtime/refetch. Formula and scope did not change; values are not hardcoded. All three status selections retained 71/75/4 at the time of checks.
- Switched Chưa hoàn thành -> Hoàn thành (4 completed tasks) -> Khác (empty) -> Chưa hoàn thành.
- Opened existing filter sheet, selected Đã nhận, completed selection: overdue group changed from 27 to 17. Reopened, Xóa lọc, Hoàn tất: returned to Tất cả / 27 overdue.
- Search FIELD-1a6f after status switching returned one FIELD-1a6fd922… task. Cleared input; list returned. Keyboard dismissed normally.
- Tapped existing refresh after switching tabs/filtering; list remained usable without an error. The summary caption stayed at the unfiltered cache's 13:22 value. No network trace was captured for this tap; a new HTTP response/time is NOT_VERIFIED.
- Two 600px upward swipes moved selection/KPI/search out of view; AppHeader stayed at y188 below native status bar y0..145. Card/list content remained scrollable above dock. Two downward swipes returned controls. No fixed dashboard obscures group headings.
- Native narrow viewport and enlarged font: NOT_VERIFIED. Device settings deliberately retained. Flexible widths/wrap/no fixed heights covered by source tests only; not claimed as Android PASS.
- Rejected-history business behavior, pagination, navigation into task detail and other roles were not retested for this presentation-only checkpoint; existing regression coverage retained.

## Executed verification

- npx tsc --noEmit: exit 0 (tsc.log).
- node --test tests/dot-c-crew-filter.test.cjs tests/crew-polish-layout.test.cjs tests/crew-tasks-v2.test.cjs tests/crew-taste-tasks-presentation.test.cjs: 23/23 PASS (targeted.log).
- node --test tests/*.test.cjs: 2022/2022 PASS, 0 skipped (full.log).
- git diff --check: exit 0; only existing LF/CRLF conversion warning on test file, no whitespace error.
- Reviewed entire app diff: presentation relocation/styles/copy only; no API, business, task-card or selection-handler changes. No added credentials, financial UI or icon libraries.
- Remote main queried with git ls-remote: 91fbb16b2c61b87add2cb06cf30f06295dbaca0d, unchanged. No push; stage explicit checkpoint paths only. Existing untracked cache/log/database/native build files retained.

Artifacts are local evidence, intentionally not staged. Commit SHA reported in delivery (the commit includes this worklog).
