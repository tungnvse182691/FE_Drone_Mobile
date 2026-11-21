# Operator upload regression fixture clock

- Date: 2026-11-21. Codex IMPLEMENT_AND_SELF_REVIEW, owner authorized verification before commit/push.
- Base: 94c7f5a8e6b612dd4e1ef8c1d1f53445e326dce6, main.
- Existing failure: uploadScenario URL expires on 2026-11-20; real Date.now() advances past it, causing an extra URL-admission generation. This is a calendar-dependent test fixture, not evidence of a production upload defect.
- Change: scope a fixed 2026-11-05 Date implementation to loadUploadWorkflow's isolated VM. Preserve original assertions, including expired-2020 admission, generation and immutable key checks. No production file or API changed.
- Executed: `node --test tests/package6-drone-journal.test.cjs`: 45/45 PASS, exit 0. Log `.cache/safearea-acceptance-20261121/operator-fixture.log`.
- Executed: `node --test --test-concurrency=2 tests/*.test.cjs`: 1957/1957 PASS, exit 0, 228540.7646ms. Log `.cache/safearea-acceptance-20261121/full-regression.log`. Run includes the pending Crew safe-area patch.
- `npx tsc --noEmit`: exit 0; `git diff --check`: exit 0.
- LOGIC_TESTED only; no upload, business mutation, session reset or native upload acceptance performed.
