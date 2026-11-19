# Crew: repair history disclosure placement

Date: 2026-11-19. Mode: IMPLEMENT_AND_SELF_REVIEW. Baseline: 22828f8.

## Owner request and cause

Owner screenshots show history appearing above the closeout card after pressing “Phương án và lịch sử”. In `NormalRepairBootstrap`, the disclosure state previously revealed confirmed history in an earlier JSX block, before the pressed button. The plan and standard success notice also appeared above it. Expected: expanded content follows its disclosure button; unresolved command alerts remain visible.

## Scoped change

- `app/(crew)/wo-detail.tsx`: reuse original receipt presentation through local renderHistory; keep compact non-CONFIRMED alerts above, place full history, plan (except overview's existing plan), and standard receipt notice inside the technical panel below the button. Collapsing hides confirmed history again. All original history remains available when expanded.
- No API, effect, journal, eligibility, assessment, start/finish, mutation handler, route or server-state change. No BE edit, dependency, app restart or emulator role switch.
- `tests/wave1-crew.test.cjs`: assert expanded receipt follows disclosure, collapse hides confirmed receipt, and existing zero-POST/disabled-start assertions remain for Progress/Complete.

## Executed verification

- `npx tsc --noEmit`: exit 0; `.cache/operator-uiux-20261119/final-owner-corrections-tsc.log`.
- Full `node --test --test-concurrency=2` over `tests/*.test.cjs`: 1907/1907 PASS, 237020 ms; `final-owner-corrections-regression.log` in the same evidence directory. Focused disclosure test also passed (`crew-disclosure-green.log`). LOGIC_TESTED only.
- Intermediate assertion used an invalid scalar children selector; corrected to inspect Text children arrays. That initial failure alone is not claimed as proof of reproducing the original bug. JSX ordering and owner screenshots establish the cause.
- Manual source diff, changed-source privacy/cost/icon scan and `git diff --check`: PASS. Self-review only, no independent review claim.
- Native Crew/iPhone before/after, scroll retention, expansion/collapse, font scaling and Reduce Motion: NOT_RUN. Owner's physical iPhone is not connected to the tools; Android remains Operator as requested. No Android verification claim for Crew.

Main retained. Local checkpoint only; no push. Existing untracked artifacts preserved.
