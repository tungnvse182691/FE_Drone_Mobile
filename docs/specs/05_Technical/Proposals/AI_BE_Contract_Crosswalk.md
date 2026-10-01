# BE-AI contract crosswalk

**Status:** `PROPOSED_DELTA`; business authority is approved by D12/D13/33A, but transport/provider/runtime are not enabled.

| Capability | BE authority | AI transport draft | Required provenance/gate |
|---|---|---|---|
| Video analysis | PM triggers; BE freezes manifest/attempt and validates artifact/result | AI `POST /v1/video-analysis/jobs`, status/cancel by attempt | Manifest/hash/file verification, service identity, attempt fencing, idempotency |
| Duplicate matching | BE selects project-scoped candidate snapshot; PM decides link/new/recurrence/defer/reject | AI `POST /v1/duplicate-matching/jobs` | Snapshot hash/version, candidate completeness, no auto merge |
| Completion event | BE inbox/receipt is durable; late/stale attempts are archived | AI callback/event draft | eventId + canonical hash, result artifact verified, per-attempt fence |
| File access/artifacts | BE owns file ID, scope and checksum; AI receives short-lived access | Internal BE service endpoints in AI proposal | No Reporter PII, no arbitrary URL fetch, VERIFIED before active result |
| Offline evaluation | Android may evaluate using immutable task/policy snapshot; BE replays/checks authority | Not an AI endpoint | `FAST_TRACK_EVALUATE` is explicit proposed sync kind; legacy clients remain 3-kind compatible |

## Contract status

- BE canonical OpenAPI: `docs/diagram/V2/05_Technical/openapi.yaml`, version `0.2.0-draft-alignment`, `x-contract-status: PROPOSED_DELTA`, `x-runtime-status: NOT_ENABLED`.
- FE baseline/generated artifacts are regenerated from the same canonical hash.
- AI service OpenAPI remains a separate proposed service contract. It is not counted as one of the 133 BE operations.
- No Postman runtime request is added for these service-only proposals; BE endpoint tasks must add/update Postman when implementation is separately authorized.

## Unresolved gates

Provider identity/transport, timeout/retry/heartbeat, artifact session details, real video/SRT/route bytes, CRS/calibration and performance/AI evaluation remain unverified or proposed. Do not turn any of these into production defaults from this crosswalk.
