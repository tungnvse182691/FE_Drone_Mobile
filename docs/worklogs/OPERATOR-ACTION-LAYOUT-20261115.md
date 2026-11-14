# Operator task action layout — 2026-11-15

Mode: Codex IMPLEMENT_AND_SELF_REVIEW. Base FE 8c96645, main.
BE origin/develop fetched and pinned: 85879fe9082774cf5098a9ba281f56b9c651f8ea.
Android emulator-5554 / Expo Go / Metro 8090 / sandbox API 18181.

## Finding and scope

Native task detail showed a narrow rejection action next to the primary acceptance action. Stack both actions at full width, primary first, with inline icons and shrinkable labels. Remove the shared flex growth from standalone preparation/confirmation buttons. No journal, payload, guards, retry, permission, storage, or BE changes.

Reference: Material stacked actions for labels that do not fit: https://m1.material.io/components/dialogs.html and https://m2.material.io/design/components/buttons.html . Reuse existing project tokens and MaterialIcons; no package change.

## Executed verification

- LOGIC_TESTED: focused UI/journal tests 71 passed, 0 failed; .cache/operator-buttons-focused-20261115.log.
- Full node --test tests/*.test.cjs: 1644 passed, 0 failed/cancelled/skipped; .cache/operator-buttons-full-20261115.log.
- npx tsc --noEmit exit 0; git diff --check exit 0.
- ANDROID_E2E_VERIFIED: isolated task c85bbf13-3b25-477f-8d3b-bfaf487fb466. Inspected screenshot of full-width primary and rejection actions. Rejection opens its reason screen, empty reason disables preparation, back returns to task detail without posting.
- Same task: primary preparation displays saved-but-not-sent; explicit confirmation sends through the existing durable journal. Detail refresh shows Da nhan / ACCEPTED and upload action; no stale acceptance/rejection action remains.
- HTTP_VERIFIED read: Operator GET /api/v1/survey-tasks/c85bbf13-3b25-477f-8d3b-bfaf487fb466 returns 200, ACCEPTED, version AAAAAAACETg=. Evidence .cache/operator-buttons-readback-20261115.json.

Layout checkpoint only. This is not completion of the three-role audit or native offline/security acceptance. No additional BE change needed for the button layout.
