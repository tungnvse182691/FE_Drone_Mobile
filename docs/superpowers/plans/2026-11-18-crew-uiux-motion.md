# Crew remaining UI and motion implementation plan

> Execute sequentially with the executing-plans skill. No delegation or parallel edits.

**Goal:** Synchronize the remaining Crew views after inspecting each on Android.

**Architecture:** Opt in to existing CrewMotion helpers. Keep existing mounted routes, handlers, guards and API callers. Presentation changes stay inside Crew routes/components.

**Tech stack:** Expo Router, React Native, TypeScript, installed Reanimated.

**Spec:** Owner request in this chat dated 2026-11-18; AGENTS.md; skills/DESIGN.md; docs/specs/06_Mobile-Expo/Crew/.

## Constraints

- No backend, package, native config, API, permissions, eligibility or workflow changes.
- Preserve pending data, emulator/cache and unrelated artifacts. No push.
- Inspect and capture Android before editing a screen. Major layout/interaction changes require owner approval.
- Gold for primary emphasis; neutral surfaces and semantic state colors. Minimum 48dp actions; font scaling retained.
- Reduce Motion respected; animation never grants success or delays commands.

## Checkpoints

Checkpoint 2026-11-18: owner stopped further UI implementation and requested commit/push to main. Tasks, Profile, Sync, Receiving, task detail/history and report-defect presentation batches are committed. Remaining checkpoints below are not a claim of completion; see docs/worklogs/2026-11-18-crew-uiux-checkpoint.md for verification limits.

- [ ] Tasks: inspect filters, completed list, scroll and navigation. Modify app/(crew)/tasks.tsx only for tones and feedback, retaining exact filter/navigation handlers. Test tests/dot-c-crew-filter.test.cjs, crew-ui-restore and Crew motion tests.
- [ ] Profile: inspect stats, rows, scrolling and safe dialogs. Modify app/(crew)/profile.tsx, preserve logout/session behavior. Verify row navigation and return.
- [ ] Sync: inspect journals and empty/error/read states without replaying pending writes. Modify app/(crew)/sync.tsx and inspected Crew panels only for presentation.
- [ ] Receiving: inspect entry, scrolling and existing errors; preserve assignment behavior.
- [ ] Detail and facts: inspect task detail plus read-only disclosures; use existing real data. Keep safety/assessment/start/finish handlers. Add motion only to inspected disclosures.
- [ ] Navigation/maps: inspect legitimate entry, controls and back; preserve map coordinates/links and permissions.
- [ ] Progress/complete/correction: inspect reachable fixture state, keyboard and image sections without submitting historical data. Preserve all journal/media/preconditions.
- [ ] Report/viewfinder/field-review: inspect safe entry and back, preserve capture, measurement, offline and submit logic.

## Per-checkpoint verification and commit

1. Save original Android screenshot under .cache/crew-all-uiux-20261118; record concrete issues before edit.
2. Read entire touched component, caller and relevant tests; reuse CrewPressable and CrewContentTransition. Do not remount forms or alter business conditionals.
3. Run targeted handler/guard tests, npx tsc --noEmit and full node --test tests/*.test.cjs. Inspect failures; do not weaken assertions.
4. Revisit Android, tap/scroll/back and capture after evidence. Record unexercised states as NOT_RUN, never infer native from Node tests or claim unmeasured FPS.
5. Review diff, MaterialIcons/UD-06/privacy and git diff --check. Stage exact paths; commit each independently verified screen locally.
6. Coverage report in docs/worklogs with screenshot paths, effects, tests, commit SHAs and remaining gaps. Never bypass guards to obtain visual evidence.
