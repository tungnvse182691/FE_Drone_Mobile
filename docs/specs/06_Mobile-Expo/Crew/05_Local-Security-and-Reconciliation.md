# Crew local security and reconciliation

Use Expo SecureStore or equivalent OS-protected storage for bearer refresh tokens and private key material. Keep access tokens memory-first. Do not put raw evidence, presigned URLs, full ProblemDetails or private keys in logs, AsyncStorage or plain SQLite.

A production app should use an approved native encrypted database/file queue and explicit logout/key-loss policy, but SQLCipher, Keystore interoperability, background sync and encrypted local photos are not verified by this Backend repository. Mark those decisions `PROPOSED_EXPO` until an Expo native build and device test prove them.

## Reconciliation algorithm

1. Persist exact command body, K, source/task/item versions and origin before attempting a network command.
2. On timeout, classify `UNKNOWN`; query supported resource/receipt endpoints or replay the same K under current authority.
3. Treat `COMMITTED`/`REPLAYED` as durable effects only. Keep `PENDING_DEPENDENCY`, `STALE_SNAPSHOT`, `CONFLICT` visible and require snapshot/refetch or owner action.
4. Never replace an origin, reset first-start time, change original actor, or resolve conflicts with last-write-wins.
5. After revocation, membership expiry, key loss or snapshot staleness, stop mutation and require reauthorization. Preserve evidence for later handover/review.

Security boundaries are Backend-authoritative. Local encryption protects at-rest exposure but cannot prove signature ownership, sensor accuracy or true event time.
