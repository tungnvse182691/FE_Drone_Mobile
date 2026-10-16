# Background jobs, outbox và integration boundaries

**Phase 2B · 15/10/2026 · source pin `1b577d703cda203c6066eba98ff005341739849e` · independent JEV review pending.**

[Canonical entrance](../README.md) · [Phase 2A workflows (owner PASS)](../02_Business-Workflows/README.md) · [Phase 2B review](PHASE2B_REVIEW_REPORT.md) · [Open status/GAP registry](../00_Governance/03_Implementation-and-Verification-Status.md).

`CURRENT_VERIFIED` ở đây = observed source/static metadata, không deployed acceptance. Owner decisions và latest [HUY specification](../../../planning/development/HUY-FINAL-INTEGRATION.md) xác định `TARGET_CONFIRMED`; [confirmed decisions](../../product/confirmed-decisions.md) giữ qualifiers. `PROPOSED`, `HISTORICAL`, `NOT_VERIFIED` theo [authority/legend](../00_Governance/01_Authority-and-Source-of-Truth.md). Phase 0 model/API capture được dùng sau recheck 1334 source hashes, không gọi SQL hay tuyên bố fresh runtime capture. Technical identifiers RoadGuardSystem và routes hiện hữu được giữ; product HoangHaiWarrantySystem, Supervisor/PM Web, Reporter/Operator/Crew Mobile React Native Expo.

## Hosted registration isn't external delivery

Current host has seven worker classes below; registration is conditional. Every worker must create scope for scoped services/repos. Cancellation exits; logged retry/fault isn't success. Intervals are source scheduling defaults, not processing SLA or replica-safe throughput.

| Worker | Composition condition | Source loop / responsibility |
|---|---|---|
| ValidationRunWorker | Always AddApiPlatformServices | CompleteNextValidationRunAsync; idle 1s; compatibility validation, not real model benchmark |
| H6NotificationWorker | Always AddApiPlatformServices | Calendar/clocks/unresolved/unregistered audit; ≤100 ProcessOne per iteration; 5s |
| UploadVerificationWorker | Program Development + Minio endpoint nonempty | ProcessOneVerificationInRoundAsync; 30s round scheduling |
| MultipartRecoveryWorker | UploadSession:RecoveryEnabled | RecoverMultipartsAsync; 5s loop |
| ExportWorker | Anh02:WorkersEnabled | ProcessNextAsync; configured polling min1s |
| RetentionEvaluationWorker | Anh02:WorkersEnabled | ProcessOneAsync; 15s; evaluation only |
| AiMockRunWorker | WorkersEnabled AND MockEnabled AND Development/Testing/Test | Synthetic BE analysis ProcessOneAsync; idle5s; no real FastAPI inference |

The outbox `processing_job.dispatch` row is not a verified production dispatcher/provider call. No extra hosted “FastAPI worker” is invented. NotificationOutboxConsumer/ConsumerEffectService/OutboxWorkRepository scoped seams need callers; static reporting capture consumers run synchronously. H6 has its own catalog/source adapters/lease/current-recipient processing. Multiple pipelines must not be treated as one automatic queue bridge.

## Outbox, clocks và retries

Business producer commits facts/audit/outbox under its command boundary. H6 claims registered events, parses protocol, resolves source/current recipients, persists occurrence/delivery attempt/inbox scope/audit/receipt with fenced lease. Missing source/actor remains unresolved; malformed protocol rejected; no broadcast to all Supervisors to force success. Retry preserves occurrence/clock origin; missed weekly occurrence/history uses bounded policy and doesn't auto-assign task or grant role.

Business duty received ACK locks request/version/current recipient and writes immutable first ACK/server time/outbox; notification read/delivery isn't ACK. Lease/receipt fencing protects known durable effects, not exactly-once network delivery. P2-06 FT final decision/audit lacks adopted informational producer; adapter/source declarations alone don't prove event was produced.

Export uses QUEUED/RUNNING lease/reclaim, completion/failure token fence and heartbeat (20s source). Immutable snapshot + current file/source guard is required at render/complete/download. Storage/IO/HTTP unavailability is retryable where FailAsync terminal=false; corrupt snapshot/invalid source/render classification is distinct. Retention serializable evaluation + SQL application lock keeps snapshot/completion atomic; no deletion. Source SQL transaction protections do not certify host replica/clock/time-provider/deployment behavior.

## AI processing: actual compatibility boundary

PM human POST `/api/v1/processing-jobs` receives CreateProcessingJobRequestDto with datasetId/BandScope/modelVersionId/preprocessingVersion/configVersion/mode. Server-confirmed/integrity-passed dataset and released model source gate creation. Persistence records block/job/attempt/manifest hash + dispatch outbox. GET job polls; retry K+If-Match only retryable source, creates new attempt. Initial dispatch has attemptId; retry dispatch uses attemptNumber — don't claim identical adopted provider payload or fabricate provider `/predict` route.

Internal POST `/api/v1/internal/processing-jobs/{jobId}/results` binds ReceiveAiResultRequestDto: JobAttemptId, ManifestHash, ModelVersionId, Mode, RawResultFileId, ChecksumSha256, Detections. Service validates detection ID, frame file, nonnegative timestamp, type, confidence0..1 and normalized bbox shape. Repository checks attempt belongs to job, job manifest/model/mode, verified raw result checksum/project; saves AIDetections and completes job. These are candidates for PM decision, not confirmed Defect or physical dimensions.

**P1-02 / PARTIAL**: compatibility repository does not fence latest/active attempt; receipt fingerprint detectionsJson+checksum isn't full job/attempt/manifest/model/mode identity. Existing belongs-to-job check is real but insufficient for latest-attempt business fence. Late/out-of-order/replayed exploit is NOT_VERIFIED, not a reproduced test failure here. Bounded BE+AI callback design/tests follow separately.

## AI service authentication versus provider acceptance

AiServiceBearer explicitly validates issuer, audience `roadguard-be-ai`, lifetime with zero clock skew, signing key by kid, nonempty subject and exact client_type AI_SERVICE. AiCallback policy requires this scheme/claim. Human PM/Expo token isn't the callback trust domain. There is no new token issuance/provisioning endpoint documented; key distribution/rotation/tenant deployment is an operational decision to verify separately. Human Jwt audience must not silently replace service audience.

## Synthetic path, real YOLO và data boundaries

ANH02 mock worker/run stores leased/pinned provenance and synthetic detections through its own source seam. It is not evidence FastAPI runs YOLO on genuine drone videos, supports all requested classes, has a real checkpoint, capabilities, metrics or external blob access. **P1-01/P1-05 NOT_VERIFIED** remain. Mode REAL field existing doesn't create a provider integration.

Road context/segments/sections/telemetry/model version/file hashes are integration facts to preserve; current manifests/DTOs are authority for actual wire. Full external capabilities/context transport/artifact access/callback protocol remains adoption work, not a Phase 2B cookbook. Image road-surface segmentation can be placed where approved architecture needs it; GIS segmentation isn't pixel masking. No SfM/orthomosaic/DSM/3D or AI physical measurement scope.

Keep legacy validation route/data model as compatibility source only, no product revival of AI-derived physical dimensions. [Survey and processing](../02_Business-Workflows/05_Drone-Survey-Dataset-and-Processing.md), [candidate/Defect authority](../02_Business-Workflows/04_Candidate-Decisions-and-Defect.md), [NORMAL/FT](../02_Business-Workflows/README.md) and [notification/ACK/export](../02_Business-Workflows/10_Notifications-Publication-Reporting-and-Retention.md) retain their separate authority. **PARTIAL** source architecture; external/model/deployment acceptance NOT_VERIFIED.

## Source evidence và verification boundary

Symbol/line dưới đây tại `1b577d703cda203c6066eba98ff005341739849e`. Partial declarations được bổ sung bằng method locator; không coi một interface/DI entry là bằng chứng mọi runtime branch đã chạy.

- [ValidationRunWorker](../../../RoadGuardSystem.API/BackgroundServices/ValidationRunWorker.cs#L5): source declaration.
- [H6NotificationWorker](../../../RoadGuardSystem.API/Workers/H6NotificationWorker.cs#L7): source declaration.
- [UploadVerificationWorker](../../../RoadGuardSystem.API/Workers/UploadVerificationWorker.cs#L5): source declaration.
- [MultipartRecoveryWorker](../../../RoadGuardSystem.API/Workers/MultipartRecoveryWorker.cs#L5): source declaration.
- [ExportWorker](../../../RoadGuardSystem.API/Workers/ExportWorker.cs#L6): source declaration.
- [RetentionEvaluationWorker](../../../RoadGuardSystem.API/Workers/RetentionEvaluationWorker.cs#L4): source declaration.
- [AiMockRunWorker](../../../RoadGuardSystem.API/Workers/AiMockRunWorker.cs#L4): source declaration.
- [NotificationOutboxConsumer](../../../RoadGuardSystem.Repositories/Implementations/Messaging/NotificationOutboxConsumer.cs#L11): source declaration.
- [ConsumerEffectService](../../../RoadGuardSystem.Repositories/Implementations/Messaging/ConsumerEffectService.cs#L16): source declaration.
- [OutboxWorkRepository](../../../RoadGuardSystem.Repositories/Implementations/Messaging/OutboxWorkRepository.cs#L8): source declaration.
- [H6NotificationDispatchRepository](../../../RoadGuardSystem.Repositories/Implementations/Messaging/H6NotificationDispatchRepository.Calendar.cs#L10): source declaration.
- [ProcessingV2Service](../../../RoadGuardSystem.Services/Implementations/Processing/ProcessingV2Service.cs#L12): source declaration.
- [ProcessingV2PersistenceService](../../../RoadGuardSystem.Repositories/Implementations/Processing/ProcessingV2PersistenceService.cs#L17): source declaration.
- [AiServiceJwtBearerConfiguration](../../../RoadGuardSystem.API/Authentication/AiServiceJwtBearerConfiguration.cs#L8): source declaration.
- [Anh02AiService](../../../RoadGuardSystem.Services/Implementations/Processing/Anh02/Anh02AiService.cs#L17): source declaration.
- [ExportRepository](../../../RoadGuardSystem.Repositories/Implementations/Exports/ExportRepository.SourceAuthority.cs#L7): source declaration.
- [RetentionRepository](../../../RoadGuardSystem.Repositories/Implementations/Retention/RetentionRepository.cs#L12): source declaration.
- [ProcessingV2PersistenceService.CreateAsync](../../../RoadGuardSystem.Repositories/Implementations/Processing/ProcessingV2PersistenceService.cs#L35): method source.
- [ProcessingV2PersistenceService.RetryAsync](../../../RoadGuardSystem.Repositories/Implementations/Processing/ProcessingV2PersistenceService.cs#L92): method source.
- [ProcessingV2PersistenceService.ReceiveResultAsync](../../../RoadGuardSystem.Repositories/Implementations/Processing/ProcessingV2PersistenceService.cs#L117): method source.

Business/SQL/HTTP/native/external tests Phase 2B **NOT_RUN** (docs-only). Fresh static link/reference/hash/diff checks nằm trong [review report](PHASE2B_REVIEW_REPORT.md). Test source/checkpoint cũ chỉ `HISTORICAL` theo revision, không runtime PASS mới. Independent JEV **PENDING**.
