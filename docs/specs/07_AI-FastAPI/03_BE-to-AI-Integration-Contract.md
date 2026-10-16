# Backend to AI integration contract

## Backend authoritative routes

| API | Method/path | Auth and contract |
|---|---|---|
| API-044 | POST `/api/v1/processing-jobs` | Human PM/Supervisor, bearer, `Idempotency-Key`; `CreateProcessingJobRequestDto`; returns 202 and ETag |
| API-045 | GET `/api/v1/processing-jobs/{jobId}` | PM/Supervisor/Operator project scope |
| API-046 | POST `/api/v1/processing-jobs/{jobId}/retry` | PM/Supervisor, `Idempotency-Key` + `If-Match`, retryable state |
| API-031 | POST `/api/v1/internal/processing-jobs/{jobId}/results` | `AiCallback` policy; AI service identity; `ReceiveAiResultRequestDto` + `Idempotency-Key` |

The Backend creates the authoritative manifest/attempt and dispatch outbox. Existing source does not establish an adopted external provider route such as `/predict`, a queue protocol, artifact download protocol, or deployment URL. `worker_service.py` routes are repository-local AI routes: `POST /api/v1/jobs/submit`, `GET /api/v1/jobs/{job_id}/status`, and `GET /health`; they are `CURRENT_IMPLEMENTED_AI` source only and `NOT_VERIFIED_E2E` against Backend.

`ManifestModel` fields include manifest/job/block IDs, contract version, target band, optional road section/segment, width/centerline context, video intervals, model config, callback URL and mock flag. This is not evidence that the Backend sends this exact JSON; adoption requires an owner-approved provider contract preserving Backend pins.

The Backend worker currently records dispatch outbox data with attempt identity (`ProcessingV2PersistenceService.cs` lines 67 and 106). An implementation handoff must carry attempt, manifest hash, model version, mode, source artifact identity and checksum without weakening project scope.
