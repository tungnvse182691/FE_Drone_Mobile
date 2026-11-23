# Crew Home / Tasks copy grouping — 2026-11-23

Mode: IMPLEMENT_AND_SELF_REVIEW. Baseline: 570101e, main.

## Scope
- Home: one accurate incomplete-task heading; one loaded-scope disclaimer in the approved overview; compact unframed timestamp/refresh presentation. Existing formatter shortens visible codes while accessibility retains the original code.
- Tasks: acceptance metadata grouped in the footer; redundant generic inspection description removed only when no actual classification/batch/post-repair metadata exists.
- KPI, API, filters, navigation, acceptance guards, clipboard original code, pagination and cache unchanged. No other role changed.
- Research: https://www.nngroup.com/articles/gestalt-proximity/ (group related information through proximity).

## Evidence
Folder: `.cache/crew-copy-grouping-20261123/`.
- Real Android BEFORE: `home-before.png`, `tasks-before.png`.
- Real Android AFTER: `home-after-verified.png`, `home-after-final.png`, `tasks-after.png`.
- `home-after.png` was taken before Fast Refresh applied and is NOT valid AFTER evidence.
- Pixel 6 Pro emulator, 1440x3120. Observed Home and Tasks updated through Fast Refresh without reload/restart. Home KPI remained 72/4. Tasks card opened the detail route; Android Back returned to Tasks. Home tab returned to Home.
- Detail remained loading during observation: detail data/content NOT_VERIFIED. Refresh spinner observed; successful HTTP completion not claimed. One UI-tree dump timed out; subsequent dump succeeded. No business mutation, logout or device configuration change.
- Narrow viewport, large font, full accessibility and load-more native interaction NOT_VERIFIED this checkpoint.

## Verification
- `npx tsc --noEmit`: exit 0; `typecheck-final.log`.
- `node --test tests/crew-polish-layout.test.cjs tests/dot-c-crew-filter.test.cjs tests/crew-tasks-v2.test.cjs tests/crew-taste-tasks-presentation.test.cjs tests/crew-home-motion.test.cjs tests/crew-ui-restore.test.cjs`: 50/50 PASS; `targeted-final.log`.
- Initial full regression: 2023/2024; old Home literal-code assertion failed after display formatting. Updated assertion to verify formatter and original accessibility value.
- Final `node --test tests/*.test.cjs`: 2024/2024 PASS; `full-regression-final.log`.
- `git diff --check`: PASS. Reviewed source diff: presentation only; existing action handlers and query code unchanged. Changed additions contain no credentials or business-cost display.

## Pagination clarification
Load more remains conditional on `hasNextPage && !inbox.error`. Tasks renders it after the list; Home retains it in its inbox presentation. `getNextPageParam` accepts a nonrepeated `nextCursor`. Refresh calls existing refetch (reset only for HTTP 400); focus refetch remains unchanged. Absence of the button is not evidence of automatic all-page loading or realtime updates.

Local checkpoint only; no push. Existing untracked caches/logs/database/native build retained.

## Follow-up: Home summary container / iPhone pagination spacing
- Owner requested a compact bounded surface around the incomplete-task heading, see-all action and inbox controls. Added a token-colored white surface, thin border and rounded corners in Home only.
- Owner iPhone screenshot showed Refresh touching the right-aligned load-more button. Home load-more now occupies a separate full-width row with an 8dp top gap and centered label. Other presentations, query handlers, cursor and disabled/loading guards unchanged.
- `npx tsc --noEmit`: exit 0 (`summary-typecheck-final.log`). Related Home/inbox/layout/recovery tests: 63/63 (`summary-targeted-final.log`). `git diff --check`: PASS. Full 2024/2024 result above predates this layout-only follow-up; not rerun.
- Owner iPhone screenshot confirms the summary surface before the pagination-spacing adjustment; final iPhone layout NOT_VERIFIED locally. Android Expo Go displayed an ANR dialog during inspection; no restart/reset/close-app performed. The files `home-summary-box*.png` show Tasks, not Home, and are NOT valid Home AFTER evidence. Final native layout remains NOT_VERIFIED.
