# Crew sync presentation and receiving acknowledgment

- Reviewer: Codex, IMPLEMENT_AND_SELF_REVIEW; base FE 03e60e2.
- BE contract/runtime: 85879fe9082774cf5098a9ba281f56b9c651f8ea; sandbox API localhost:18181, Android 14 emulator-5554, Expo Go/Metro 8090.
- Scope: Crew sync empty legacy queue presentation and isolated PM-to-Crew supplement acknowledgment verification. No BE source edits.

## Fix and LOGIC_TESTED

Hide legacy tabs, totals and empty legacy panel when that queue has no rows. Keep current FIELD drafts and signed-command journal visible. A retained legacy command still renders its existing history without granting send authority. The misleading zero total previously appeared above confirmed FIELD submissions.

- Mounted regression: red 1 failed/1 passed before fix; green 2 passed after fix.
- Combined targeted tests with tests/t06a.test.cjs: 36 passed.
- node --test tests/*.test.cjs: 1642 passed, 0 failed/skipped; .cache/crew-sync-empty-full-20261115.log.
- npx tsc --noEmit: exit 0; git diff --check clean.
- Runtime app/src scan for Ionicons and financial UI terms: no matches. No navigation, contract, persistence or command behavior changed.

## ANDROID_E2E_VERIFIED / HTTP_VERIFIED

Sync: native view shows current FIELD summaries below the header without the unrelated legacy zero totals; expandable older-task list remains. Nonempty legacy behavior has mounted test evidence only.

Isolated project 72f84201-c001-4000-8000-000000000001, task 16f6fa58-2363-4b68-ac51-2ac8349aeeac:

1. PM POST field-inspection-tasks/{taskId}/reviews with SUPPLEMENT for submission dda350f4-02b6-4c82-bd88-54aeed838781. Intent, exact payload, quoted version and idempotency key persisted before mutation. HTTP 201 review aa56c0de-246d-47f8-8fcd-da2c88599dad; task readback 200 SupplementRequired.
2. Crew Android opened generated receiving request 6ec4789e-690a-4a7a-8468-c7916528cea0 and acknowledged once. Screen displayed confirmed time and disabled confirmed button. Readback matched acknowledgment 7a2f6449-14bf-4bbc-bdd5-09c50dc6ef0c.
3. Screenshot inspected after transient toast faded: detail rows, badge and button remain within screen bounds. No receiving implementation change in this checkpoint.

Evidence: .cache/crew-field-supplement-review-20261115.json and .cache/crew-receiving-inventory-20261115.json. Credentials are excluded. Receiving ACK means receipt of request, not repair acceptance.

## Limits

This checkpoint does not claim the complete three-role matrix, native signed offline interoperability, process-death/account-isolation scenarios, or the subsequent supplement submission. No new BE contract gap established here.
