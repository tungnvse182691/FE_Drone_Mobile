# File storage, multipart upload và verification

**Phase 2B · 15/10/2026 · source pin `1b577d703cda203c6066eba98ff005341739849e` · independent JEV review pending.**

[Canonical entrance](../README.md) · [Phase 2A workflows (owner PASS)](../02_Business-Workflows/README.md) · [Phase 2B review](PHASE2B_REVIEW_REPORT.md) · [Open status/GAP registry](../00_Governance/03_Implementation-and-Verification-Status.md).

`CURRENT_VERIFIED` ở đây = observed source/static metadata, không deployed acceptance. Owner decisions và latest [HUY specification](../../../planning/development/HUY-FINAL-INTEGRATION.md) xác định `TARGET_CONFIRMED`; [confirmed decisions](../../product/confirmed-decisions.md) giữ qualifiers. `PROPOSED`, `HISTORICAL`, `NOT_VERIFIED` theo [authority/legend](../00_Governance/01_Authority-and-Source-of-Truth.md). Phase 0 model/API capture được dùng sau recheck 1334 source hashes, không gọi SQL hay tuyên bố fresh runtime capture. Technical identifiers RoadGuardSystem và routes hiện hữu được giữ; product HoangHaiWarrantySystem, Supervisor/PM Web, Reporter/Operator/Crew Mobile React Native Expo.

## Metadata, bytes và authority

StoredFile/Files identifies immutable content metadata; FileScope records owner/project/purpose/target; UploadSession records expected checksum/size, object key, multipart identity/status/rowversion/recovery fencing. Bytes live in storage adapters, not inferred SQL BLOB fields. A verified hash isn't permission: create/presign/complete/poll/download need current actor/purpose/assignment/source guards. Same file can be referenced in evidence chains without cloning ownership.

| Adapter / interface | Actual composition / behavior | Boundary |
|---|---|---|
| IFileContentStore → LocalFileContentStore | Singleton, configured absolute root, objects + .tmp, contained paths/reparse checks, streaming SHA256/size/prefix MIME and atomic file identity | Local filesystem adapter; no proof durable production mount/ACL/backup |
| IUploadObjectStorage → MinioUploadObjectStorage | Singleton adapter uses AWSSDK.S3 client with endpoint/path-style configuration; multipart URLs/list/abort/complete/read/verify | No implied healthy MinIO service or public download grant |
| IAnh02ArtifactStore → MinioAnh02ArtifactStore | TryAddSingleton registration; S3 artifact write/read with temporary local spool | Does not replace every upload/content store or prove provider blob access |

## Multipart success flow and states

1. UploadService normalizes create DTO/purpose/checksum/size, current project and task-specific operator/Crew checks. ReporterEvidenceService uses private REPORT_PHOTO create without project. Offline capture upload needs supported admission/capture origin, not a caller-provided flag alone.
2. Persistence creates immutable file identity/scope/session and exact storage object key with idempotency receipt. External multipart initiation has recovery/fence path for unknown create/ack outcomes; no distributed SQL+S3 transaction implied.
3. GetPartUrls presigns bounded part numbers for owned current session; retry part ordering/ETags follow DTO/service. URLs are finite upload capabilities; they are not immutable evidence/source permission.
4. Complete records verification intent/returns accepted where controller maps 202. UploadSession domain Pending/Uploading/Verifying/Verified/Failed is not a guarantee every intermediate state is visited. Complete/receipt or HTTP200 isn't verified bytes.
5. Verification calls storage CompleteAndVerifyAsync, streaming actual bytes for size/SHA256/prefix MIME, then verifies expectation and persists result under current session/recovery fences. NoSuchUpload branch checks object metadata/read to recover possible prior complete. Multipart ETag is not treated as full SHA256.
6. Poll session/file until verified before report/dataset/FIELD source admission. Failed/expired/wrong scope/source conflict must not be fixed by client `verified=true`. Dataset integrity/server confirmation is another producer gate after file verification.

## Size, type và source constraints

UploadAdmissionPolicy constants: image JPEG/PNG REPORT_PHOTO/BEFORE/AFTER/MEASUREMENT ≤20 MiB; MP4 SURVEY_VIDEO ≤8 GiB; application/x-subrip TELEMETRY ≤10 MiB; dataset aggregate ≤32 GiB in dataset workflow. DOCUMENT/ROUTE_SOURCE retain int.MaxValue ceiling; don't advertise unlimited documents. Options defaults part8MiB/session24h/signed PUT15m; configurable, not provider/service quality acceptance. Size counters are long where video needs it; part size int isn't total file size.

Video/SRT/GPS are source evidence with dataset/task/geometry/model pins. SRT accepted MIME doesn't prove correct timestamp alignment, GPS coverage/accuracy or actual real-video inference. Optional video↔SRT/time-offset binding and MISSING telemetry status must not become coverage PASS. Road GIS segment/section context differs from image road segmentation; AI candidates retain frame/timestamp/bbox/model provenance, not physical dimensions.

## Recovery and temporal reads

MultipartRecoveryWorker is only registered when UploadSession:RecoveryEnabled; persisted MultipartFence/Phase/Deadline/NextCheckAt coordinates create/recover checks. Exact-object multipart lookup, abort and stale completion checks avoid treating a storage response as unique authoritative session effect. Storage outage can remain retryable/uncertain; don't erase receipt/source identity to retry. Actual kill/restart/multi-replica/large-video recovery needs runtime tests separately.

UploadVerificationWorker registration is **Development + nonempty MinioStorage:Endpoint** in Program. A production build with S3 adapter DI doesn't automatically verify uploads. This is a concrete deployment boundary to resolve/verify before release, not proof all deployments broken. Hosted registration and current environment topology are different evidence. Documented gates remain P1-05, no new implemented scheduler invented.

Read source can revoke during storage await. General upload and export paths must be read individually; ExportService.ContentAsync buffers/verifies metadata and rechecks source/rights/expiry after await. Reporter download has P1-04 temporal risk. Private report evidence never becomes globally readable because task/Case/Defect exists; publication needs explicit recipients/current pins.

## Retention/export boundaries và GAPs

Retention evaluator uses source obligation/warranty basis, confirmed current inventory and active holds. Warranty eligibility is end+5 years, retaining whole local Vietnam calendar day; max unresolved/unknown basis blocks. ELIGIBLE_FOR_REVIEW isn't physical deletion. File immutable identity/metadata and retention boundary don't imply bucket lifecycle configured or a purge job running. Backup/restore must retain SQL references and bytes consistently; no live drill here.

Related [Reporter evidence](../02_Business-Workflows/03_Reporter-Evidence-and-IncidentCase.md), [survey](../02_Business-Workflows/05_Drone-Survey-Dataset-and-Processing.md), [FIELD](../02_Business-Workflows/06_FIELD-Inspection-and-Measurements.md), [offline](../02_Business-Workflows/09_Offline-Snapshots-Sync-and-Handover.md), [retention/export](../02_Business-Workflows/10_Notifications-Publication-Reporting-and-Retention.md). **PARTIAL**, P1-04/P1-05 open: source adapters/verification exist, real MinIO/TLS/ACL/SMTP/native/video/backup NOT_VERIFIED. Backend storage encryption/transfer doesn't certify Expo local encryption. No storage config/bytes/migrations touched.

## Source evidence và verification boundary

Symbol/line dưới đây tại `1b577d703cda203c6066eba98ff005341739849e`. Partial declarations được bổ sung bằng method locator; không coi một interface/DI entry là bằng chứng mọi runtime branch đã chạy.

- [StoredFile](../../../RoadGuardSystem.BusinessObjects/Files/StoredFile.cs#L3): source declaration.
- [FileScope](../../../RoadGuardSystem.BusinessObjects/Files/FileScope.cs#L3): source declaration.
- [UploadSession](../../../RoadGuardSystem.BusinessObjects/Files/UploadSession.cs#L5): source declaration.
- [UploadAdmissionPolicy](../../../RoadGuardSystem.BusinessObjects/Files/UploadAdmissionPolicy.cs#L3): source declaration.
- [UploadService](../../../RoadGuardSystem.Services/Implementations/Files/UploadService.cs#L15): source declaration.
- [UploadPersistenceService](../../../RoadGuardSystem.Repositories/Implementations/Files/UploadPersistenceService.FieldAdmission.cs#L9): source declaration.
- [ReporterEvidenceService](../../../RoadGuardSystem.Services/Implementations/Files/ReporterEvidenceService.cs#L15): source declaration.
- [MinioUploadObjectStorage](../../../RoadGuardSystem.Repositories/Implementations/Storage/MinioUploadObjectStorage.cs#L12): source declaration.
- [LocalFileContentStore](../../../RoadGuardSystem.Repositories/Implementations/Storage/LocalFileContentStore.cs#L8): source declaration.
- [MinioAnh02ArtifactStore](../../../RoadGuardSystem.Repositories/Implementations/Storage/MinioAnh02ArtifactStore.cs#L10): source declaration.
- [MultipartRecoveryWorker](../../../RoadGuardSystem.API/Workers/MultipartRecoveryWorker.cs#L5): source declaration.
- [UploadVerificationWorker](../../../RoadGuardSystem.API/Workers/UploadVerificationWorker.cs#L5): source declaration.
- [RetentionEligibilityEvaluator](../../../RoadGuardSystem.BusinessObjects/Retention/RetentionEligibilityEvaluator.cs#L9): source declaration.
- [UploadService.CreateAsync](../../../RoadGuardSystem.Services/Implementations/Files/UploadService.cs#L39): method source.
- [UploadService.CompleteAsync](../../../RoadGuardSystem.Services/Implementations/Files/UploadService.cs#L157): method source.
- [UploadService.DownloadAsync](../../../RoadGuardSystem.Services/Implementations/Files/UploadService.cs#L194): method source.
- [MinioUploadObjectStorage.CompleteAndVerifyAsync](../../../RoadGuardSystem.Repositories/Implementations/Storage/MinioUploadObjectStorage.cs#L160): method source.

Business/SQL/HTTP/native/external tests Phase 2B **NOT_RUN** (docs-only). Fresh static link/reference/hash/diff checks nằm trong [review report](PHASE2B_REVIEW_REPORT.md). Test source/checkpoint cũ chỉ `HISTORICAL` theo revision, không runtime PASS mới. Independent JEV **PENDING**.
