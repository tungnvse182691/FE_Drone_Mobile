# Operator sync list UI — 2026-11-15

Mode: IMPLEMENT_AND_SELF_REVIEW. Scope: DroneTaskRecoveryList and its mounted tests.

## Finding and change

Owner screenshot: seven long outlined buttons repeated task/action/receipt text. Replaced them with two-line list rows and separate pending/history sections. History is collapsed initially; unresolved/prepared commands remain visible. No journal, receipt, dispatcher or API contract changed.

Design reference: https://m3.material.io/components/lists/overview (list hierarchy: primary/supporting text and trailing affordance).

## Evidence

- Source baseline: FE `318910a`, BE remote develop `85879fe9082774cf5098a9ba281f56b9c651f8ea`.
- LOGIC_TESTED: `node --test tests/package6-drone-journal.test.cjs`: 30/30. Tests cover pending visibility, collapsed receipts, expand/collapse and exact destination navigation without dispatch.
- Typecheck: `npm run typecheck`, exit 0.
- ANDROID_E2E_VERIFIED: Pixel_6_Pro, Android 14, Expo Go/Metro 8090. Observed seven receipts collapsed under History; expanded two-line rows; tapped c48b2765 and opened the matching task detail. These actions do not post/replay commands. Screenshot `.cache/operator-sync-detail.png`; expanded list visually inspected via device screenshot.
- Full regression: `node --test tests/*.test.cjs`, 1671/1671, 94608 ms, `.cache/operator-offline-expanded-regression.log`. Separate offline implementation remains outside this UI checkpoint.

No Backend change or fixture mutation.
