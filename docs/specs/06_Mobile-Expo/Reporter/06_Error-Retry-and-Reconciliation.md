# Error, retry and reconciliation rules

| Condition | Reporter behavior | Authority |
|---|---|---|
| 400/415 | Show field/media validation; do not retry unchanged invalid input | Backend ProblemDetails + DTO |
| 401 | Pause queue; single-flight API-003 refresh; atomically replace tokens; replay only unchanged requests; otherwise login | Session service |
| 403 | Stop and show permission/privacy state; do not switch endpoint or use public URL | Reporter ownership/role guard |
| 404 | Show not found/private unavailable without probing other IDs | Resource scope |
| 409 | Show idempotency/concurrency conflict; reread resource and require user decision | K/fingerprint/current state |
| 412 | Refresh API-217/API-212, replace V and review before API-219/API-213 retry | Strong ETag/version |
| 428 | Fetch required version/session state, then retry once with same command semantics | Required precondition |
| 429 | Respect server retry guidance and OTP/upload rate limits; bounded backoff | Rate limit |
| 5xx/timeout/offline | Keep command payload, K and local queue record; mark `UNKNOWN`; reconcile by GET or same-key replay | Durable receipt/source state |

For API-211/214/213 uploads, persist upload ID, file ID, part numbers, part ETags, checksum and version in protected storage. Resume only from server session state; never assume a local part succeeded without its storage receipt. A completed session remains pending until API-208 says `VERIFIED`.

For API-216/219 reports, generate K once per user command and persist it before sending. A lost response is not permission to create a second report; replay the same K and payload or reread API-215/API-217. For API-219, retain the original report V and show a conflict if the server has advanced it. Do not merge two accounts’ caches or cursors after logout/login.

Unknown outcomes for login/refresh require conservative token handling: do not overwrite a known-good refresh token with an unconfirmed successor. If the server rejects refresh, clear secrets and require login. Network retry does not prove that an email, OTP, upload worker or publication was delivered.

**Evidence:** Phase 2C [idempotency/concurrency guide](../../04_API-Contracts/05_Idempotency-Concurrency-and-Errors.md), API-003, API-007, API-208–219 and source services. Actual Android network, process-kill and storage-provider behavior is `NOT_VERIFIED_EXPO_E2E`.
