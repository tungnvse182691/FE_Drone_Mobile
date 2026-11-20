# Operator Work Package — technical disclosure polish

Date: 2026-11-20. Mode: IMPLEMENT_AND_SELF_REVIEW, Codex self-review (not independent). Base: 7c587dc, branch main. Checkpoint SHA: `git log -1 -- app/\(drone\)/work-package.tsx` after commit.

## Scope and change
- Only technical disclosure presentation in app/(drone)/work-package.tsx, focused tests and this log.
- Separate scopeVersion and selected geometry.route.versionNo with exact original values.
- Each geometry ref retains original current/pinned condition; route, segment set and every segment ID receive separate label/value rows.
- Compact IDs use first8…last8 only for display. Xem mã đầy đủ reveals exact raw selectable strings; no API/ref/selection/route/cache changes.
- Local styles: navy text, soft gray version surface, subtle group separators, wrapping rows without fixed text heights. Existing AnimatedPressable feedback; no new continuous motion.

## Executed verification
- PASS: npx tsc --noEmit (exit 0).
- PASS: node --test tests/operator-workpackage-technical.test.cjs tests/drone-ui02a.test.cjs — 29/29.
- PASS final: node --test tests/drone-ui02c.test.cjs tests/operator-workpackage-technical.test.cjs — 16/16. Updated old UUID expectation to explicitly open full IDs first.
- Full regression: node --test --test-concurrency=2 <all tests/*.test.cjs> — initially 1931/1933. One obsolete compact-ID expectation fixed and targeted rerun passed. Remaining failure: package6-drone-journal.test.cjs:375, expected URL admission generation1, got2. Unchanged upload fixture returns expiresAt 2026-11-20T00:00:00Z; current date is later. Reproduced in focused rerun (60/61). This test reads unchanged upload workflow/journal; neither runtime nor test was altered for this UI task. Full regression is NOT all green; no claim otherwise. Outside-scope journal change intentionally not made.
- PASS: git diff --check; manual diff audit: UI/state for disclosure only, no new icon or UD-06 content, no credentials.
- ANDROID_E2E_VERIFIED (read-only subset): Expo Go emulator-5554, 1440x3120, density560, fontScale1.0; navigate detail→work package, scroll, open technical, full IDs→compact, close technical, Back returns detail. Native real package has 1 geometry ref and 2 segments.
- NATIVE_VERIFIED: long press selects entire original UUID and Android Copy toolbar appears. Clipboard roundtrip NOT_VERIFIED (input tool refused Copy tap); no promise of measured copy readback.
- LOGIC_TESTED: isolated harness with 2 refs × 3 segments, raw IDs, current/pinned labels, exact versions including 0, no fixture mutation.
- NOT_VERIFIED: narrow device/large system font, multiple refs on native, Reduce Motion system toggle; no system settings changed in this task.

## Screenshots (local preserved artifacts)
- .cache/operator-workpackage-technical/before.png
- .cache/operator-workpackage-technical/after-summary.png
- .cache/operator-workpackage-technical/after-full.png
- .cache/operator-workpackage-technical/selection.png

No mutations, restart, push, branch changes or artifact deletion. Preexisting untracked files preserved. Scoped UI gates pass; known unrelated full-suite date-fixture failure remains disclosed.
