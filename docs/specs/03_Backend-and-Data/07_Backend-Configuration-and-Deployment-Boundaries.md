# Backend configuration và deployment boundaries

**Phase 2B · 15/10/2026 · source pin `1b577d703cda203c6066eba98ff005341739849e` · independent JEV review pending.**

[Canonical entrance](../README.md) · [Phase 2A workflows (owner PASS)](../02_Business-Workflows/README.md) · [Phase 2B review](PHASE2B_REVIEW_REPORT.md) · [Open status/GAP registry](../00_Governance/03_Implementation-and-Verification-Status.md).

`CURRENT_VERIFIED` ở đây = observed source/static metadata, không deployed acceptance. Owner decisions và latest [HUY specification](../../../planning/development/HUY-FINAL-INTEGRATION.md) xác định `TARGET_CONFIRMED`; [confirmed decisions](../../product/confirmed-decisions.md) giữ qualifiers. `PROPOSED`, `HISTORICAL`, `NOT_VERIFIED` theo [authority/legend](../00_Governance/01_Authority-and-Source-of-Truth.md). Phase 0 model/API capture được dùng sau recheck 1334 source hashes, không gọi SQL hay tuyên bố fresh runtime capture. Technical identifiers RoadGuardSystem và routes hiện hữu được giữ; product HoangHaiWarrantySystem, Supervisor/PM Web, Reporter/Operator/Crew Mobile React Native Expo.

## Composition/environment assumptions

Program uses WebApplication.CreateBuilder/configuration providers; explicitly adds optional appsettings.Development.local.json with reload only in Development. Secrets/environment injection outside source is deployment responsibility. No real connection string/password/token/bucket credential/recipient is copied here. Configuration field presence/default is source evidence; supplied/effective production value is NOT_VERIFIED.

Database InitializeOnStartup only Development + RoadGuardDatabase:InitializeOnStartup; development-user seed only Development + SeedDevelopmentUsers. This documentation never runs initialize/seeder/migration/apply/SQL writes. Assembly has current baseline migrations; old deployment upgrade/backup/application state must be checked independently, not inferred from migration files existing.

## Configuration registry

The table below is generated from actual Options CLR properties (names/types only, **no secret/default credential values**). Options type doesn't by itself prove section is bound/validated/consumed; relevant composition is cited. Specific flag keys outside options are listed afterward.

| Options type / source | Property | CLR type |
|---|---|---|
| [RoadGuardDatabaseOptions](../../../RoadGuardSystem.Repositories/Options/RoadGuardDatabaseOptions.cs#L8) | `ConnectionString` | `string` |
| [RoadGuardDatabaseOptions](../../../RoadGuardSystem.Repositories/Options/RoadGuardDatabaseOptions.cs#L8) | `CommandTimeoutSeconds` | `int` |
| [RoadGuardDatabaseOptions](../../../RoadGuardSystem.Repositories/Options/RoadGuardDatabaseOptions.cs#L8) | `MaxRetryCount` | `int` |
| [RoadGuardDatabaseOptions](../../../RoadGuardSystem.Repositories/Options/RoadGuardDatabaseOptions.cs#L8) | `EnableDetailedErrors` | `bool` |
| [RoadGuardDatabaseOptions](../../../RoadGuardSystem.Repositories/Options/RoadGuardDatabaseOptions.cs#L8) | `EnableSensitiveDataLogging` | `bool` |
| [JwtOptions](../../../RoadGuardSystem.Services/Options/JwtOptions.cs#L5) | `Issuer` | `string` |
| [JwtOptions](../../../RoadGuardSystem.Services/Options/JwtOptions.cs#L5) | `Audience` | `string` |
| [JwtOptions](../../../RoadGuardSystem.Services/Options/JwtOptions.cs#L5) | `ActiveKeyId` | `string` |
| [JwtOptions](../../../RoadGuardSystem.Services/Options/JwtOptions.cs#L5) | `SigningKeys` | `Dictionary<string, string>` |
| [JwtOptions](../../../RoadGuardSystem.Services/Options/JwtOptions.cs#L5) | `AccessTokenLifetimeMinutes` | `int` |
| [JwtOptions](../../../RoadGuardSystem.Services/Options/JwtOptions.cs#L5) | `SessionLifetimeHours` | `int` |
| [JwtOptions](../../../RoadGuardSystem.Services/Options/JwtOptions.cs#L5) | `RefreshTokenLifetimeDays` | `int` |
| [IdentityOnboardingOptions](../../../RoadGuardSystem.Services/Options/IdentityOnboardingOptions.cs#L3) | `Secret` | `string` |
| [IdentityOnboardingOptions](../../../RoadGuardSystem.Services/Options/IdentityOnboardingOptions.cs#L3) | `OtpLifetimeMinutes` | `int` |
| [IdentityOnboardingOptions](../../../RoadGuardSystem.Services/Options/IdentityOnboardingOptions.cs#L3) | `OtpMaxAttempts` | `int` |
| [IdentityOnboardingOptions](../../../RoadGuardSystem.Services/Options/IdentityOnboardingOptions.cs#L3) | `OtpResendCooldownSeconds` | `int` |
| [IdentityOnboardingOptions](../../../RoadGuardSystem.Services/Options/IdentityOnboardingOptions.cs#L3) | `OtpMaxResendsPerWindow` | `int` |
| [IdentityOnboardingOptions](../../../RoadGuardSystem.Services/Options/IdentityOnboardingOptions.cs#L3) | `OtpResendWindowMinutes` | `int` |
| [IdentityOnboardingOptions](../../../RoadGuardSystem.Services/Options/IdentityOnboardingOptions.cs#L3) | `InvitationLifetimeHours` | `int` |
| [IdentityOnboardingOptions](../../../RoadGuardSystem.Services/Options/IdentityOnboardingOptions.cs#L3) | `FrontendBaseUrl` | `string` |
| [IdentityOnboardingOptions](../../../RoadGuardSystem.Services/Options/IdentityOnboardingOptions.cs#L3) | `BrandName` | `string` |
| [IdentityOnboardingOptions](../../../RoadGuardSystem.Services/Options/IdentityOnboardingOptions.cs#L3) | `SenderDisplayName` | `string` |
| [IdentityOnboardingOptions](../../../RoadGuardSystem.Services/Options/IdentityOnboardingOptions.cs#L3) | `SmtpHost` | `string` |
| [IdentityOnboardingOptions](../../../RoadGuardSystem.Services/Options/IdentityOnboardingOptions.cs#L3) | `SmtpPort` | `int` |
| [IdentityOnboardingOptions](../../../RoadGuardSystem.Services/Options/IdentityOnboardingOptions.cs#L3) | `SmtpUsername` | `string` |
| [IdentityOnboardingOptions](../../../RoadGuardSystem.Services/Options/IdentityOnboardingOptions.cs#L3) | `SmtpPassword` | `string` |
| [IdentityOnboardingOptions](../../../RoadGuardSystem.Services/Options/IdentityOnboardingOptions.cs#L3) | `LogoPath` | `string` |
| [PasswordChangeFingerprintOptions](../../../RoadGuardSystem.Services/Options/PasswordChangeFingerprintOptions.cs#L5) | `Key` | `string` |
| [FileStorageOptions](../../../RoadGuardSystem.Repositories/Options/FileStorageOptions.cs#L3) | `RootPath` | `string` |
| [FileStorageOptions](../../../RoadGuardSystem.Repositories/Options/FileStorageOptions.cs#L3) | `MaximumSizeBytes` | `long` |
| [MinioStorageOptions](../../../RoadGuardSystem.Repositories/Options/MinioStorageOptions.cs#L3) | `Endpoint` | `string` |
| [MinioStorageOptions](../../../RoadGuardSystem.Repositories/Options/MinioStorageOptions.cs#L3) | `BucketName` | `string` |
| [MinioStorageOptions](../../../RoadGuardSystem.Repositories/Options/MinioStorageOptions.cs#L3) | `AccessKey` | `string` |
| [MinioStorageOptions](../../../RoadGuardSystem.Repositories/Options/MinioStorageOptions.cs#L3) | `SecretKey` | `string` |
| [MinioStorageOptions](../../../RoadGuardSystem.Repositories/Options/MinioStorageOptions.cs#L3) | `UseSsl` | `bool` |
| [UploadSessionOptions](../../../RoadGuardSystem.Repositories/Options/UploadSessionOptions.cs#L3) | `PartSizeBytes` | `int` |
| [UploadSessionOptions](../../../RoadGuardSystem.Repositories/Options/UploadSessionOptions.cs#L3) | `SessionLifetimeHours` | `int` |
| [UploadSessionOptions](../../../RoadGuardSystem.Repositories/Options/UploadSessionOptions.cs#L3) | `SignedPutUrlLifetimeMinutes` | `int` |
| [UploadSessionOptions](../../../RoadGuardSystem.Repositories/Options/UploadSessionOptions.cs#L3) | `RecoveryEnabled` | `bool` |
| [UploadSessionOptions](../../../RoadGuardSystem.Repositories/Options/UploadSessionOptions.cs#L3) | `RecoveryDeadlineSeconds` | `int` |
| [UploadSessionOptions](../../../RoadGuardSystem.Repositories/Options/UploadSessionOptions.cs#L3) | `RecoveryRetrySeconds` | `int` |
| [UploadSessionOptions](../../../RoadGuardSystem.Repositories/Options/UploadSessionOptions.cs#L3) | `RecoveryBatchSize` | `int` |
| [SessionDeviceMetadataOptions](../../../RoadGuardSystem.Repositories/Options/SessionDeviceMetadataOptions.cs#L3) | `MaxDeviceIdLength` | `int` |
| [SessionDeviceMetadataOptions](../../../RoadGuardSystem.Repositories/Options/SessionDeviceMetadataOptions.cs#L3) | `MaxPlatformLength` | `int` |
| [SessionDeviceMetadataOptions](../../../RoadGuardSystem.Repositories/Options/SessionDeviceMetadataOptions.cs#L3) | `MaxAppVersionLength` | `int` |
| [SessionDeviceMetadataOptions](../../../RoadGuardSystem.Repositories/Options/SessionDeviceMetadataOptions.cs#L3) | `SensitiveKeywords` | `IReadOnlyCollection<string>` |
| [ExportOptions](../../../RoadGuardSystem.Services/Interfaces/Exports/IExportService.cs#L16) | `UnicodeFontPath` | `string` |
| [ExportOptions](../../../RoadGuardSystem.Services/Interfaces/Exports/IExportService.cs#L16) | `WorkerPollSeconds` | `int` |
| [Anh02AiOptions](../../../RoadGuardSystem.Services/Interfaces/Processing/IAnh02AiService.cs#L6) | `MockEnabled` | `bool` |
| [Anh02AiOptions](../../../RoadGuardSystem.Services/Interfaces/Processing/IAnh02AiService.cs#L6) | `FixtureDirectory` | `string` |


| Section/flag | Current binding/branch | Operational consequence |
|---|---|---|
| RoadGuardDatabase | Required options; validator uses host isProduction; UseSqlServer+NTS | Need actual trusted SQL endpoint/catalog; no readiness from /health |
| Jwt | Required options/key validation; human and AI service schemes | kid/signing key rotation + issuer/audience/key continuity; no key material here |
| IdentityOnboarding, PasswordChangeFingerprint | Authentication application options/validation | SMTP/OTP/invitation URLs/fingerprint secret supplied securely; delivery NOT_VERIFIED |
| FileStorage | Local content root/limit | Absolute durable mount/access boundaries/backup required independently |
| MinioStorage | Endpoint/bucket/access/secret/SSL options; multipart adapter | S3 compatibility, endpoint connectivity, ACL/TLS/presigns and recovery NOT_VERIFIED |
| UploadSession | Defaults + RecoveryEnabled flag | Part/session/URL/recovery scheduling; production verifier isn't implied by adapter |
| Anh02:WorkersEnabled | Program | Export + retention worker gate |
| Anh02:MockEnabled | Environment-gated worker and mock source | Dev/Test synthetic only, not REAL provider enablement |
| Anh02:Export | ExportOptions binding | Lease/retention/poll/render limits from source config, not production throughput promise |
| SessionDeviceMetadata | Persistence validation/options | Metadata bounds/safety; not hardware attestation |

RoadGuardDatabase production validator forbids TrustServerCertificate=true, Encrypt=false and EnableSensitiveDataLogging=true; requires server/catalog and positive timeout/nonnegative retries. A validator acceptance isn't TLS connectivity/drift/schema/permission verification. DbContext logging branches follow options; production prohibition is enforced by the host-mode options validator, not a separate guard around each logging call; avoid secrets/PII in logs. Source validation failures aren't authorization to weaken options in production.

## Storage, workers và real integration dependencies

SQL Server and file/object storage must preserve metadata and content together. LocalFileContentStore isn't automatically shared across replicas; MinIO adapter registration isn't bucket creation/ACL validation. Export/AI artifact adapter is separately registered as MinioAnh02ArtifactStore; its local temporary spool is not a durable local fallback or alternate production artifact store. UploadVerificationWorker is Development+nonempty endpoint; recovery explicit flag; H6/Validation always hosted; export/retention flag-gated; mock additionally nonproduction environment-gated. A release needs actual job ownership/liveness/retry/lease/recovery design verified, not flags flipped to imitate completion.

Live FastAPI/provider protocol/checkpoint/class map/context/artifact access remains P1-01/P1-05 NOT_VERIFIED. Callback audience/claims exist but provision/rotation/deployed caller is not established. Real video/model/telemetry/map/CRS/road coverage admission data need provenance. No invented provider route, queue/Redis/Kafka or microservice framework dependency.

## HTTP/security/logging boundaries

HTTPS redirection, secure host cookies, anti-forgery and JWT validation exist. Reverse proxy/forwarded headers/CORS/origin policy, external TLS termination, persistent/shared DataProtection keyring, replica routing and managed secret rotation are deployment NOT_VERIFIED; composition alone doesn't prove them. Don't assume browser can use cookie API cross-origin or mobile token survives native restart. API error sanitization/correlation is chapter 01/03; request/worker logs must avoid credentials, OTP, private metadata and source file machine paths. No actual log sink/alert/SLO verification performed.

GET `/health` is liveness only; no SQL/MinIO/SMTP/FastAPI dependency checks registered by that call. Swagger only Development in Program; retained source OpenAPI isn't a deployed Swagger endpoint proof. No production URL, host topology/replicas/bucket ACL or deploy pipeline acceptance invented.

## Backup, recovery và owner gates

Current repo has data/storage/admission history and source test fixtures, not executed production backup/restore drill evidence for this task. A proposed recovery plan must align SQL snapshots/objects/artifacts/checksums, migration level, auth/DataProtection/signing secrets and offline public-key/grant/receipt history. Recovered old database must not accidentally revive revoked sessions/keys or duplicate accepted original operations. Key loss/unsynced mobile data requires explicit consumer policy; no escrow assumed.

RPO≤15m/RTO≤4h/metadata p95≤2s at 50 concurrent users in [confirmed decision 40](../../product/confirmed-decisions.md) and [data/quality targets](../../product/data-and-quality.md) are targets, not measured outcomes. Backup frequency/retention/object lifecycle, infrastructure sizing and production procedures require owner/ops confirmation with actual evidence, not new defaults in docs. No remote service calls, database tests, deployment, secret rotation, dependency/package upgrade or backup operation executed.

## JEV and linked behavior

**PARTIAL** for configuration/source controls; external deployment/security/performance/restore **NOT_VERIFIED** (P1-05), provider P1-01 remains. Worker production verifier boundary retained as existing source observation under P1-05, no new reproduced incident/GAP closure. Exact source/migrations/contract/test failures unchanged. [All ten business workflows](../02_Business-Workflows/README.md), [background jobs](05_Background-Jobs-and-Integration-Boundaries.md), [storage](04_File-Storage-and-Upload.md), [offline](06_Offline-Backend-Architecture.md) supply prerequisites; Phase 2C/UI/provider implementation NOT_STARTED.

## Source evidence và verification boundary

Symbol/line dưới đây tại `1b577d703cda203c6066eba98ff005341739849e`. Partial declarations được bổ sung bằng method locator; không coi một interface/DI entry là bằng chứng mọi runtime branch đã chạy.

- [RoadGuardPersistenceExtensions](../../../RoadGuardSystem.Repositories/Extensions/RoadGuardPersistenceExtensions.cs#L32): source declaration.
- [AuthenticationServiceCollectionExtensions](../../../RoadGuardSystem.Services/Extensions/AuthenticationServiceCollectionExtensions.cs#L16): source declaration.
- [RoadGuardDatabaseOptionsValidator](../../../RoadGuardSystem.Repositories/Options/RoadGuardDatabaseOptionsValidator.cs#L11): source declaration.
- [JwtOptionsValidator](../../../RoadGuardSystem.Services/Options/JwtOptions.cs#L24): source declaration.
- [FileStorageOptions](../../../RoadGuardSystem.Repositories/Options/FileStorageOptions.cs#L3): source declaration.
- [MinioStorageOptions](../../../RoadGuardSystem.Repositories/Options/MinioStorageOptions.cs#L3): source declaration.
- [UploadSessionOptions](../../../RoadGuardSystem.Repositories/Options/UploadSessionOptions.cs#L3): source declaration.
- [LocalFileContentStore](../../../RoadGuardSystem.Repositories/Implementations/Storage/LocalFileContentStore.cs#L8): source declaration.
- [MinioUploadObjectStorage](../../../RoadGuardSystem.Repositories/Implementations/Storage/MinioUploadObjectStorage.cs#L12): source declaration.
- [RoadGuardDatabaseOptionsValidator.Validate](../../../RoadGuardSystem.Repositories/Options/RoadGuardDatabaseOptionsValidator.cs#L20): method source.
- [RoadGuardDatabaseOptionsValidator.Validate](../../../RoadGuardSystem.Repositories/Options/RoadGuardDatabaseOptionsValidator.cs#L25): method source.

Business/SQL/HTTP/native/external tests Phase 2B **NOT_RUN** (docs-only). Fresh static link/reference/hash/diff checks nằm trong [review report](PHASE2B_REVIEW_REPORT.md). Test source/checkpoint cũ chỉ `HISTORICAL` theo revision, không runtime PASS mới. Independent JEV **PENDING**.
