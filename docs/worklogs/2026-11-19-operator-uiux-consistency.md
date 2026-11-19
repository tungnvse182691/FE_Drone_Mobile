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
| requests | Shared task row updated; route-specific checkpoint pending |
| request-detail | Pending |
| request-decline | Pending |
| work-package | Pending |
| survey-map | Pending; no basemap/provider change authorized |
| upload | Pending; no upload mutations authorized for screenshots |
| sync | Pending; refresh must remain read only |
| log | Pending |
| profile | Pending |
