# Operator decline receipt status — 2026-11-15

Mode: Codex IMPLEMENT_AND_SELF_REVIEW. FE base d42dbc4, main.
BE: 85879fe9082774cf5098a9ba281f56b9c651f8ea.
Environment: Android emulator-5554 / Expo Go / Metro 8090 / sandbox API 18181.

## Finding and change

After native API-230 decline, the validated durable receipt said REJECTED but the summary chip still said NEW_ASSIGNED. Pass the receipt status through the panel's existing completion callback. The decline screen keeps this display status scoped to its actor/session/environment/task. The original detail/version is not rewritten or reused for mutation authority. No optimistic status, dispatcher, permission, retry, payload or storage changes.

## Contract checked

Operator screen/API matrix; 03_Task-Dataset-and-Error-Handling.md; pinned SurveyV2Controller and Services/Implementations/Surveys/SurveyV2Service.cs. GetTaskAsync denies inactive assignments. MutateTaskAsync explicitly permits the latest declined assignment to reach its decline receipt, without granting task read/accept/submit authority. Therefore Operator GET 403 after decline is expected; PM QA GET can read back REJECTED. No BE edit required for this finding.

## Executed evidence

- Regression RED: new summary test failed because onResolved was absent.
- Focused UI/journal tests: 71 passed, 0 failed.
- Full `node --test tests/*.test.cjs`: 1644 passed, 0 failed/cancelled/skipped (.cache/operator-decline-full-20261115.log).
- `npx tsc --noEmit`: exit 0. `git diff --check`: exit 0. Changed runtime scan: no Ionicons/financial UI matches.
- ANDROID_E2E_VERIFIED: task fc37b18a-c07a-4f30-9f05-84f4e058f768: blank reason blocks preparation, typed reason enables preparation, saved command is visibly not sent until confirmation, confirmation resolves to REJECTED. This exposed the stale summary.
- ANDROID_E2E_VERIFIED after fix: isolated task d42ea3ec-fb55-4085-80ec-48c1aea4e662: native reason input → durable PREPARED → explicit confirmation → receipt. Screenshot inspected: both summary chip and receipt status say Đã từ chối, no confirmation send button remains. The typing tool timed out after partial QA text; the displayed nonempty text was reviewed before preparation and was retained unchanged after sending.
- HTTP_VERIFIED readback: PM QA GET /api/v1/survey-tasks/{id} returns 200 / REJECTED for both tasks; Operator GET returns 403 for both. Read-only evidence .cache/operator-decline-readback-20261115.json. Mutations were through Android's existing durable command journal, not a new HTTP script.

## Limits

This fixes the summary during confirmed submission. Reopening a declined task can still display the expected permission denial with the preserved receipt panel; this checkpoint does not grant access or manufacture refreshed task details. No new BE contract gap found in API-230. Full three-role acceptance and native offline security remain separate work.
