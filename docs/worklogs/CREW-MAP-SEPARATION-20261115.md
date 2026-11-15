# Crew map separation and QA plan label — 2026-11-15

Mode: IMPLEMENT_AND_SELF_REVIEW. Scope: latest owner screenshots, dedicated Crew MapLibre screen, known English QA repair plan label, push existing local commits to main. No independent reviewer was used.

## Source and changes

- Start main HEAD: 6695a0145d56bbe6d97ec0c3e2afb78e2d2ef38e; origin/main fb0e379f577f96826cef79d9097ceeca3c33395f (19 ahead, 0 behind).
- BE source read-only at 5d20a09a72643b1f7ab87bebeee7d309e593f689. Existing API-080 defectTarget and API-087 explicit wgs84Geometry readers/assignment validation retained; no new contract or mutation.
- Detail replaces embedded map with Mở bản đồ. New group-prefixed task-map route revalidates task via CrewTaskBoundary, reads assigned geometry, supports route/individual segment selection and back/reload. Tab dock hidden on this route; full MapLibre canvas uses safe areas and 48dp controls.
- Exact known fixture text QA concrete surface repair with safety boundary gets a Vietnamese display label. Arbitrary authored repair plans pass through unchanged; no server data was altered.
- Layout follows the existing Operator dedicated map and Material structure guidance: https://m1.material.io/layout/structure.html .

## Executed verification

- LOGIC_TESTED: initial red c10bc UI tests 3 failed/3 passed before implementation; final targeted `node --test tests/c10bc-ui.test.cjs tests/crew-ui-restore.test.cjs tests/crew-ui-patch11.test.cjs`: 43 passed, 0 failed (.cache/crew-map-split-targeted.log). Includes retained target with unavailable geometry, separate segment coordinates, forbidden read, session/unmount guards and known-only localization.
- `npx tsc --noEmit`: exit 0 (.cache/crew-map-split-tsc.log).
- `node --test --test-concurrency=2 tests/*.test.cjs`: 1720 passed, 0 failed (.cache/crew-map-split-full.log). Two additional guard cases were appended after that file was loaded by this run; both are included in the final 43-case targeted run.
- Expo Doctor first run: 17/20; npm child processes failed (exit 134 / 3221226505) while regression was active. Separate retry: 20/20, exit 0 (.cache/crew-map-split-doctor-retry.log). No dependency changes.
- `git diff --check`: exit 0. Changed source uses MaterialIcons only; no added token/password/signed URL logging or monetary UI.
- ANDROID_E2E_VERIFIED (limited to this checkpoint): Android14 emulator-5554, Expo Go, Metro8081; explicit detail facts read, Mở bản đồ navigation, dedicated map with no dock, route/segment selection, zoom control and back to detail. Screenshot .cache/crew-map-split-android.png shows selected Đoạn 2 and rendered line. Detail hierarchy confirms Vietnamese plan; screenshot .cache/crew-plan-vietnamese-android.png.
- Fixture geometry is synthetic (offshore); this proves rendering/interaction, not real-world route accuracy. defectTarget null is shown honestly as Chưa có vị trí hư hại. No invented destination.
- iPhone native check for these changes: NOT_RUN (no controlled iPhone device available). Existing unrelated Crew acceptance blockers in CREW-FINAL-INTEGRATION-01-20261115.md remain scoped separately.

## Data preservation and delivery

No BE/Docker/SQL mutation, no Metro restart/port/config change, no cache/SQLite/media/journal deletion. Stage only checkpoint source/tests/report. Latest owner instruction explicitly authorizes pushing all local commits to main after gates; verify remote again before push.
