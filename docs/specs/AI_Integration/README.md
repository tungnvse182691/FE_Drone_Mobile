# RoadGuard AI service integration contract

**Status:** `PROPOSED_DELTA_NOT_ENABLED`  
**Version:** `ai-contract-2.0-draft`  
**Owner boundary:** AI engineer owns the FastAPI implementation and model workers. RoadGuard BE owns business authorization, job/attempt identity, file verification, manifest provenance, persistence, and acceptance/publication decisions.

This is a separate service contract. It is not an addition to the 133 public BE operations until the product owner reviews the routes and assigns implementation tasks. The AI service must never write RoadGuard business tables or decide whether a defect is accepted, repaired, published, or merged.

Business authority for the two-stage PM-triggered flow is D12/D13 and project-scoped matching is D33A. See [BE-AI contract crosswalk](../05_Technical/Proposals/AI_BE_Contract_Crosswalk.md). Transport, provider, real-file, timeout/retry and runtime verification remain separate gates.

## What is already in the BE baseline

The BE baseline has `createProcessingJob`, `getProcessingJob`, `retryProcessingJob`, and the internal service callback `receiveAiResult`. Those operations create/read/retry a persisted BE job and receive a validated service callback. They do not describe the FastAPI endpoints or worker lifecycle below.

## Proposed AI API surface

| Operation | Direction | Purpose | Idempotency |
|---|---|---|---|
| `POST /v1/video-analysis/jobs` | BE -> AI | Dispatch immutable video-analysis manifest | `Idempotency-Key` + `jobAttemptId` |
| `GET /v1/video-analysis/jobs/{jobAttemptId}` | BE -> AI | Poll worker state and completion receipt | none |
| `POST /v1/video-analysis/jobs/{jobAttemptId}/cancel` | BE -> AI | Request cancellation; does not promise immediate stop | `Idempotency-Key` |
| `POST /v1/duplicate-matching/jobs` | BE -> AI | Dispatch matching against immutable candidate snapshot | `Idempotency-Key` + `jobAttemptId` |
| `GET /v1/duplicate-matching/jobs/{jobAttemptId}` | BE -> AI | Poll matching state and receipt | none |
| `POST /v1/completion-events/{eventId}/ack` | BE -> AI | Acknowledge that BE durably received an event | `eventId` |

AI -> BE delivery uses the existing BE route `POST /api/v1/internal/processing-jobs/{jobId}/results` (`receiveAiResult`) with an AI service identity. The AI service does not call FE routes and does not use a PM/user bearer token.

## Security and data boundary

- Use mTLS plus a short-lived service credential with audience `roadguard-be-ai`; exact provider is deployment configuration.
- Every request carries `X-Correlation-Id`, `X-Contract-Version`, `jobAttemptId`, `manifestHash` where applicable, and `Idempotency-Key` for mutations.
- BE grants access to verified file/artifact IDs and scoped signed reads. Signed URLs are transport hints, never part of the manifest hash.
- Do not send Reporter name, email, account IDs, or unrelated project data. Candidate payloads use BE defect IDs and provenance references only.
- AI scores and estimated positions are proposals. Missing pose/calibration must remain `UNKNOWN`, not a fabricated precise GPS position.

## Lifecycle

1. PM triggers `createProcessingJob` in BE; upload completion alone does not dispatch AI.
2. BE creates an immutable manifest and calls `video-analysis/jobs`.
3. AI accepts or rejects the manifest, then processes asynchronously.
4. AI sends a signed completion event/result. BE validates job, attempt, manifest, checksum, schema and scope before ingest.
5. Only after a verified VIDEO_ANALYSIS artifact does BE dispatch `duplicate-matching/jobs`.
6. AI returns candidates/matches. PM decides keep, edit, split, merge or reject through BE business APIs.

Late results, retries and duplicate events must produce a receipt without replacing the active result. Cancellation is advisory; a worker may finish, but a fenced old attempt cannot change the current result.

## Contract status and next review

The schemas and routes below are a handoff draft for AI engineering. Before implementation, review timeout/retry values, model capability names, artifact size limits, retention, callback signature algorithm and the mapping to a future BE task/operation. These open items must not be silently treated as product approval.
