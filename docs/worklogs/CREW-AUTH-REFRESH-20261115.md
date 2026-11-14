# Crew action token refresh — 2026-11-15

Mode: IMPLEMENT_AND_SELF_REVIEW (Codex). Base FE b3926b1; BE origin/develop 85879fe9082774cf5098a9ba281f56b9c651f8ea. Sandbox localhost:18181, emulator-5554. No BE source, database or permission changes.

## Root cause and contract

Android accept on isolated task 837f8fd7-755a-4694-b49e-bcfe191801f8 returned 401. The existing refresh recovered the session (subsequent readback 200), but the interceptor refused to replay the Crew action. Read the Crew screen/API matrix and FIELD controller/service/repository. FIELD accept/reject/start use actor/project/action/key receipts, fingerprinting the body and expected version in a serializable transaction.

Only authentication recovery now admits these three action paths when both Idempotency-Key and quoted rowversion are present. Actor/session guards remain active. URL, body, key and If-Match stay unchanged. Ambiguous transport failures still belong to the durable command journal; this patch does not enable automatic transport retry or replay other Crew writes.

## Executed verification

- RED: targeted suite 28 passed / 3 failed before fix, `.cache/crew-refresh-red.log`.
- GREEN: `node --test tests/t01-client.test.cjs`: 33 passed, zero failed. Includes immutable accept/reject/start replay, missing headers, account switch during refresh and no retry on 503.
- `node --test tests/*.test.cjs`: 1,639 passed, zero failed/skipped; `.cache/crew-refresh-full.log` (144098 ms).
- `npx tsc --noEmit`: exit 0.
- `git diff --check`: exit 0. Icon/UD-06 scan of app/src: no matches. Changes add no UI, routes, role permissions, defect codes or branding.
- Android: after login, accept and start succeeded for the isolated task above; saved and reopened three measurement dimensions. This verifies normal action UI, not expired-token automatic recovery. Native expiry/replay is not claimed from the interceptor tests.

Self-review: scope limited to client interceptor, regression tests and this evidence record. Historical pending commands and untracked runtime artifacts preserved.
