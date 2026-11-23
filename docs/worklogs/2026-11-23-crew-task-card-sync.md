# Crew task cards sync — 2026-11-23

Mode: IMPLEMENT_AND_SELF_REVIEW. Parent: 3017ac8. Home is the approved read-only reference.

## Scope
- app/(crew)/tasks.tsx: white bordered 12dp cards, 2dp mode-colored left edge, 16dp inner padding, 12dp list spacing. Home mode tones, CrewTaskStatus, typography/chip/clock/location/footer and CrewHomeTaskPressable feedback reused without shared component changes.
- Separate 48dp copy-code target in identity row; original Clipboard handler unchanged. Acceptance/time, history notice, defect/batch/distance and Sau sửa metadata retained.
- Same crewAssignmentCanOpen guard, accessibility labels, task/assignment identity and route params. REJECTED/unknown data never grants capability. No data/query/API/cache/navigation code changes. Header/KPI/tabs/sheet untouched in this checkpoint.
- tests/crew-polish-layout.test.cjs: Home/Tasks visual dimensions parity and wrapping coverage.
- tests/dot-c-crew-filter.test.cjs: rejected-history disabled open handler and separately available copy target regression.

## Executed gates
- npx tsc --noEmit: exit 0 (card-tsc-final.log).
- Targeted existing suites: 63/63 before last history test; subsequent dot-c suite 11/11 including added history test (card-targeted.log/card-guards.log).
- node --test tests/*.test.cjs: 2020/2020 PASS, exit 0 (card-full.log).
- git diff --check: clean. Diff reviewed: presentation/style/imports only in production tasks.tsx; Home/global tokens/API/T3 unchanged.

## Android evidence — Pixel_6_Pro, emulator-5554, 1440x3120, existing Crew session
Directory: .cache/crew-tasks-premium-20261123/
- home-card-reference.png: actual approved Home cards before Tasks edit.
- tasks-controls-after.png: actual Tasks flat rows before card sync (controls checkpoint).
- tasks-card-after.png: actual synchronized Tasks card; not concept.
- home-open-detail.png / tasks-open-detail.png: both open same runtime FIELD task, short ID 60a04265; no mutation. Quay lại danh sách returns to Tasks.
- copy-search.png: original full FIELD code pasted to search; subsequent hierarchy confirmed 1 việc. Search cleared and list restored.
- rejected-empty.png: real rejected filter empty result, tabs/search/filter still reachable; reset to ALL/ALL before leaving.
Native card appearance, Home/Tasks open, Back, copy+search and acceptance sheet selection observed. Some taps took retries/delayed state; root cause NOT_DETERMINED and no unrelated patch. Do not claim universal native tap PASS.
NOT_VERIFIED: real rejected-history populated card/disabled press (no matching runtime fixture; harness regression PASS), native Load more, pressed-state capture, font scale/narrow device, Reduce Motion on-device. Motion component existing tests PASS. No app/emulator restart/reset, logout, data deletion or business mutation.

## Git preservation
T3 work safely committed separately as 1b662ae; not modified or staged in this checkpoint. UI controls separately 3017ac8. Stage explicit paths only. Existing untracked files/cache/db/log/build preserved. main; no push. origin/main checked read-only against ls-remote: 91fbb16 unchanged from local tracking ref.
