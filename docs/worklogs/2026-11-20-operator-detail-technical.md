# Operator Detail — technical information follow-up

2026-11-20. Mode: IMPLEMENT_AND_SELF_REVIEW, Codex self-review, not independent. Owner added screenshot Screenshot_1795149691.png and authorized this technical area. Base checkpoint f7db1d9; original source 7c587dc. Branch main. Commit SHA discoverable with `git log -1 -- app/\(drone\)/request-detail.tsx` after checkpoint.

## Allowlist and presentation
- app/(drone)/request-detail.tsx: technical disclosure only; local presentation state and styles.
- tests/operator-detail-technical.test.cjs, updated presentation assertion in tests/operator-ui06-crew.test.cjs, and this worklog.
- Server ID gets separate label/value with compact first8…last8 display, explicit expand/collapse and selectable original UUID.
- Task version and scope version remain distinct labels with original values and exact existing missing-scope fallback. Soft gray surface, navy values, wrapping baseline rows, 48dp toggle, no fixed text heights or clipping.
- Existing scope explanatory note retained; original technical outer disclosure retained. Command panel conditions, operation, taskId, handlers and recovery are unchanged. Existing press component handles ripple/spring/Reduce Motion; no new API-driven animation or business state.
- No shared tokens, API, navigation, command/journal/upload/video/offline edits. No mutation/restart/system font or density changes.

## Executed evidence
- PASS: npx tsc --noEmit, exit0.
- PASS: node --test tests/operator-detail-technical.test.cjs tests/drone-ui02a.test.cjs tests/drone-ui02c.test.cjs — 53/53, exit0.
- Harness verifies raw selectable original ID, compact/full/collapse, exact distinct version strings, no data mutation and unchanged command taskId/operation/collapsed state. Existing task permission/navigation tests ran in this targeted command.
- PASS: git diff --check. Manual diff review: local JSX/StyleSheet/presentation state only. rg for Ionicons/UD-06 terms in both touched screens: no matches; no new credentials or backend mutation code.
- Android Expo Go emulator-5554 (1440x3120, density560, fontScale1.0): actual task25324063, status submitted, technical disclosure open/close, scroll, UUID compact/full and back-to-compact verified. Full UUID wraps without overlapping label/value. Original scope text retained.
- NOT_VERIFIED: native Detail Back transition. A header Back tap did not leave the screen during this session. Handler is untouched; did not restart app or change navigation outside scope. Work Package Back to Detail did pass in preceding checkpoint.
- NOT_VERIFIED: native large system font/narrow screen, multiple geometry refs on native, Reduce Motion toggle, clipboard readback. Full UUID selection and Copy toolbar were observed on Work Package; exact raw selectable ID checked in Detail harness. No claim of native clipboard roundtrip.

## Full regression and baseline diagnosis
- Full rerun: node --test --test-concurrency=2 <all tests/*.test.cjs> — 1943/1945 PASS, 2 FAIL, exit1 (355s), log .cache/operator-workpackage-technical/regression-final.log. One failure was old UI06 expectation of a full UUID immediately after expanding technical; updated it to verify compact ID, open full-ID control, then exact selectable original ID. The other is the preexisting expiry-sensitive journal fixture below.
- Final targeted rerun after that test update: node --test tests/operator-detail-technical.test.cjs tests/drone-ui02a.test.cjs tests/drone-ui02c.test.cjs tests/operator-ui06-crew.test.cjs — 79/79 PASS, exit0. Full suite was not rerun a third time; there is no claim of 1945/1945 PASS. Runtime source remained identical during the assertion-only correction.
- On original7c587dc archive (tests/src/app under .cache/operator-workpackage-technical/baseline-head), ran node --test --test-name-pattern="Operator persists URL admission before POST" tests/package6-drone-journal.test.cjs: same generation2 !=1 failure, 0/1. No working source restored/overwritten.
- Repeated that original test with a temporary Node preload overriding Date.now to 2026-11-19T00:00:00Z: 1/1 PASS, exit0. This confirms fixture expiry sensitivity (getPartUrls expiresAt 2026-11-20T00:00:00Z); actual current clock remained unchanged. Only isolated test clock was overridden. Baseline artifacts preserved in .cache.
- Existing unrelated journal fixture failure is disclosed; not fixed by changing runtime workflow or unrelated tests. Do not interpret scoped UI verification as full-suite green.

## Native screenshot artifacts
- Before: .cache/operator-workpackage-technical/detail-before.png
- After compact: .cache/operator-workpackage-technical/detail-after-summary.png
- After original full ID: .cache/operator-workpackage-technical/detail-after-full.png

Local-only checkpoint; no push, branch switch, reset, clean, stash, artifact/cache/db deletion. Preexisting untracked files preserved.
