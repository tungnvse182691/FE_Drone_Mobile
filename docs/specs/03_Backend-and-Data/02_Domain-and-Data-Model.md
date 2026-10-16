# Domain, EF Core và SQL Server data model

**Phase 2B · 15/10/2026 · source pin `1b577d703cda203c6066eba98ff005341739849e` · independent JEV review pending.**

[Canonical entrance](../README.md) · [Phase 2A workflows (owner PASS)](../02_Business-Workflows/README.md) · [Phase 2B review](PHASE2B_REVIEW_REPORT.md) · [Open status/GAP registry](../00_Governance/03_Implementation-and-Verification-Status.md).

`CURRENT_VERIFIED` ở đây = observed source/static metadata, không deployed acceptance. Owner decisions và latest [HUY specification](../../../planning/development/HUY-FINAL-INTEGRATION.md) xác định `TARGET_CONFIRMED`; [confirmed decisions](../../product/confirmed-decisions.md) giữ qualifiers. `PROPOSED`, `HISTORICAL`, `NOT_VERIFIED` theo [authority/legend](../00_Governance/01_Authority-and-Source-of-Truth.md). Phase 0 model/API capture được dùng sau recheck 1334 source hashes, không gọi SQL hay tuyên bố fresh runtime capture. Technical identifiers RoadGuardSystem và routes hiện hữu được giữ; product HoangHaiWarrantySystem, Supervisor/PM Web, Reporter/Operator/Crew Mobile React Native Expo.

## Model authority và scope

`RoadGuardDbContext.OnModelCreating` applies assembly configurations plus explicit offline/lifecycle/coverage/statistics/H6 mapping and RowVersionConvention. SQL Server provider enables NetTopologySuite, command timeout and configured transient retry. [Exact EF model](../../RoadGuard-Backend-Official/04_Database/ef-model.json) is a disconnected logical/relational model capture carried forward after unchanged source hashes. It is not a schema introspection of a live SQL database; migration application/drift, physical query plans and production data quality remain NOT_VERIFIED.

Counts: **196 EF entity types / 191 relational tables / 1945 property mappings / 1940 physical columns**. Relational metadata lists **219 keys, 657 foreign keys, 692 indexes, 229 check constraints**; **48 EF concurrency-property mappings**. Keys include primary and alternate keys; index/FK counts include metadata for scoped/owned structures and are not performance acceptance. Counts below are mechanically checked against the retained JSON, never inferred from business names.

Owned/table-sharing explains five extra EF types: RepairDecisions has correction basis/decision, ReportOriginalEvidence and ReportSupplementEvidence share capture metadata, SourceDecisions contains decision/classification/source identity. These are not extra SQL tables. Shadow properties also appear in EF; e.g. current head/binding/PackageId can be queried by EF even if CLR shape differs. API DTO fields are not a database schema generator.

## Relationships và consistency

Project/current membership constrain actor scope; Reporter report/Case chain is independent of Survey. Candidate accepted source links Defect to Reporter or AI provenance, not necessarily both. FIELD task/assignment/submission/evidence and repair binding/attempt/review/obligation preserve lineage. Offline records use composite project-bound keys/FKs, not trusting a standalone device/operation UUID from another project. SQL constraints are one layer; dynamic role/current-source/clock/policy rules still require service/repository guards.

Relationship examples below use exact EF principal and delete behavior. Don't extrapolate “all cascades” or “all restrict”: session→user can cascade, many evidence/history links restrict. SQL delete behavior isn't authorization for retention deletion.

| Dependent columns | Principal columns | Delete / required |
|---|---|---|
| `Sessions.UserId` | `Users.Id` | Cascade; required=true |
| `FileScopes.FileId` | `Files.Id` | Restrict; required=true |
| `FileScopes.OwnerUserId` | `Users.Id` | Restrict; required=true |
| `FileScopes.ProjectId` | `Projects.Id` | Restrict; required=false |
| `UploadSessions.FileId` | `Files.Id` | Restrict; required=true |
| `UploadSessions.OwnerUserId` | `Users.Id` | Restrict; required=true |
| `SourceDecisions.AIDetectionSourceId` | `AIDetections.Id` | Restrict; required=false |
| `SourceDecisions.DecidedByUserId` | `Users.Id` | Restrict; required=true |
| `SourceDecisions.ProjectId` | `Projects.Id` | Restrict; required=true |
| `SourceDecisions.ReportSourceId` | `Reports.Id` | Restrict; required=false |
| `SourceDecisions.SupersedesDecisionId` | `SourceDecisions.Id` | Restrict; required=false |
| `SourceDecisions.TargetDefectId` | `Defects.Id` | Restrict; required=false |
| `FieldInspectionSubmissions.AssignmentId` | `FieldInspectionAssignments.Id` | Restrict; required=true |
| `FieldInspectionSubmissions.OperationOriginId` | `FieldInspectionOperationOrigins.Id` | Restrict; required=true |
| `FieldInspectionSubmissions.OriginalActorId` | `Users.Id` | Restrict; required=true |
| `FieldInspectionSubmissions.ParentId` | `FieldInspectionSubmissions.Id` | Restrict; required=false |
| `FieldInspectionSubmissions.ProjectId` | `Projects.Id` | Restrict; required=true |
| `FieldInspectionSubmissions.SessionId` | `FieldInspectionSessions.Id` | Restrict; required=true |
| `FieldInspectionSubmissions.StartOriginId` | `FieldTaskStartOrigins.Id` | Restrict; required=true |
| `FieldInspectionSubmissions.TaskId` | `FieldInspectionTasks.Id` | Restrict; required=true |
| `OfflineSyncBatches.CurrentImporterId` | `Users.Id` | Restrict; required=true |
| `OfflineSyncBatches.ProjectId` | `Projects.Id` | Restrict; required=true |
| `OfflineSyncBatches.GrantId, ProjectId` | `OfflineHandoverGrants.Id, ProjectId` | Restrict; required=false |
| `OfflineSyncBatches.PackageId, ProjectId` | `OfflineEncryptedPackages.Id, ProjectId` | Restrict; required=false |
| `OfflineSyncBatches.RecipientDeviceRegistrationId, ProjectId` | `OfflineDeviceRegistrations.Id, ProjectId` | Restrict; required=false |
| `OfflineSyncBatches.SourceDeviceRegistrationId, ProjectId` | `OfflineDeviceRegistrations.Id, ProjectId` | Restrict; required=true |


## Types, spatial data, versioning và provenance

SQL `uniqueidentifier`, `datetimeoffset`, `date`, `bigint`, bounded varchar/nvarchar, JSON strings and enum converters are explicit metadata; JSON text validation/allowed values vary by mapping. File expected size is bigint, part size int; don't truncate 8 GiB video into int client fields. Enum wire strings and numeric DB tinyint may differ, so use DTO/controller mapping for JSON.

Spatial columns from EF: AIDetections.Geometry, Defects.Geometry, RoadSectionVersions.Geometry and RoadSegments.Geometry use `geometry`; GroundTruthMeasurements.Location uses `geography`. Route config allows legacy UTM 32648/32649 when no CRS revision and profile-bound SRID≥0 branch otherwise; LineString check is specific to RoadSectionVersions. SRID validity is not transformation/accuracy proof. GIS geometry/native calibration/segment set pins differ from image pixel mask segmentation. Nullable AI geometry is not surveyed Crew ground truth. Official CRS/coverage/data acceptance remains a sourced gate, not an SRID assertion.

RoadSectionVersion is immutable except current marker under its command boundary; unique current filtered index and version number preserve identity. Dataset/processing model/manifest, candidate heads/source decisions, FIELD originals/submissions and repair obligation/attempt/review/history pin sources rather than rewrite historical evidence. Corrections/supplements/reassignment create bounded facts; current projection/head may change without erasing original actor/version/time claims.

RowVersionConvention marks byte[] property named RowVersion as SQL rowversion, concurrency token generated on add/update. It does not add a version to every entity. Some shadow rowversions are nullable in model; don't invent a non-null invariant from normal HTTP success. Controllers can expose quoted Base64 ETag or module hash/version tokens: not all If-Match values are raw rowversion. Immutable revisions/content hashes, K fingerprint, current head and rowversion have distinct purposes.

SaveChanges overrides call ValidatePersistenceInvariants: examples audit/reset/status logs append-only, file metadata/content identity immutable, source/version/session immutability and controlled role mutation. This is ORM-path protection, not a claim every SQL writer/ExecuteSql path is fenced by the same validation. Migration SQL and source-bound explicit SQL have their own scope. Current source exposes two migrations in model (BaselineCurrentSchema and AllowVerifiedDefectPostRepairTasks); do not reconstruct historical migration count or run migrations from this documentation task.

## DDL overlay ngoài EF metadata

Model counts ở trên không phải toàn bộ DDL cuối migration. [BaselineCurrentSchema SQL overlay L11867](../../../RoadGuardSystem.Repositories/Migrations/20261008171739_BaselineCurrentSchema.cs#L11867) bổ sung composite FKs CasePublicationEvidence/CaseConclusionEvidence → original/supplement evidence theo SourceReportId, SourceDecisions correction identity FK, cùng filtered unique `UX_RepairDecisions_Initial` trên ItemId khi SupersedesDecisionId IS NULL. Các constraint/index này không được suy mất chỉ vì EF JSON không biểu diễn chúng.

[Trigger definitions L11875](../../../RoadGuardSystem.Repositories/Migrations/20261008171739_BaselineCurrentSchema.cs#L11875) có `TR_AccountStatusChangeLogs_AppendOnly` và `TR_AIDetections_Immutable`, cùng các trigger khác trong migration để bảo vệ history/provenance/current identity với điều kiện riêng. Đây là SQL-level source protection bổ sung SaveChanges checks; không gọi mọi raw SQL write là unguarded. Source migration tồn tại không chứng minh trigger đã được apply hoặc permissions/upgrade live chính xác. Full DDL và trigger exceptions phải đọc migration; không gộp chúng vào EF metadata counts hoặc tự chạy apply.

## Selected column metadata — exact model projection

The compact slice below shows current session/privacy/upload/idempotency/geometry/offline fields. Complete fields/converters/defaults/computed SQL/precision for every entity remain in the linked JSON. NULL and concurrency are copied, not normalized into an ideal schema. No data values/secrets are included.

| Entity / property | SQL type | Nullable | Concurrency |
|---|---|---|---|
| `UserSession.Id` | `uniqueidentifier` | false | false |
| `UserSession.UserId` | `uniqueidentifier` | false | false |
| `UserSession.Lifecycle` | `tinyint` | false | false |
| `UserSession.IssuedRole` | `nvarchar(40)` | true | false |
| `UserSession.Transport` | `tinyint` | false | false |
| `UserSession.ExpiresAt` | `datetimeoffset(7)` | true | false |
| `UserSession.RowVersion` | `rowversion` | false | true |
| `StoredFile.Id` | `uniqueidentifier` | false | false |
| `StoredFile.StorageUri` | `nvarchar(2048)` | false | false |
| `StoredFile.SizeBytes` | `bigint` | false | false |
| `StoredFile.Checksum` | `char(64)` | false | false |
| `StoredFile.MimeType` | `varchar(120)` | false | false |
| `FileScope.FileId` | `uniqueidentifier` | false | false |
| `FileScope.OwnerUserId` | `uniqueidentifier` | false | false |
| `FileScope.ProjectId` | `uniqueidentifier` | true | false |
| `FileScope.Purpose` | `varchar(40)` | false | false |
| `FileScope.TargetId` | `uniqueidentifier` | true | false |
| `UploadSession.ExpectedSizeBytes` | `bigint` | false | false |
| `UploadSession.PartSizeBytes` | `int` | false | false |
| `UploadSession.ExpectedChecksumSha256` | `char(64)` | false | false |
| `UploadSession.Status` | `tinyint` | false | false |
| `UploadSession.MultipartFence` | `uniqueidentifier` | true | false |
| `UploadSession.MultipartPhase` | `varchar(20)` | true | false |
| `UploadSession.MultipartNextCheckAt` | `datetimeoffset` | true | false |
| `UploadSession.RowVersion` | `rowversion` | false | true |
| `IdempotencyRecord.ActorUserId` | `uniqueidentifier` | true | false |
| `IdempotencyRecord.ProjectId` | `uniqueidentifier` | true | false |
| `IdempotencyRecord.Operation` | `varchar(100)` | false | false |
| `IdempotencyRecord.IdempotencyKey` | `varchar(200)` | false | false |
| `IdempotencyRecord.RequestFingerprint` | `char(64)` | false | false |
| `IdempotencyRecord.OutcomeJson` | `nvarchar(max)` | false | false |
| `RoadSectionVersion.Id` | `uniqueidentifier` | false | false |
| `RoadSectionVersion.CrsProfileRevisionId` | `uniqueidentifier` | true | false |
| `RoadSectionVersion.Geometry` | `geometry` | false | false |
| `RoadSectionVersion.VersionNo` | `int` | false | false |
| `RoadSectionVersion.IsCurrent` | `bit` | false | false |
| `OfflineOperationBinding.OriginId` | `uniqueidentifier` | false | false |
| `OfflineOperationBinding.ProjectId` | `uniqueidentifier` | false | false |
| `OfflineOperationBinding.OriginalActorId` | `uniqueidentifier` | false | false |
| `OfflineOperationBinding.SourceDeviceRegistrationId` | `uniqueidentifier` | false | false |
| `OfflineOperationBinding.SnapshotId` | `uniqueidentifier` | false | false |
| `OfflineOperationBinding.CorePayloadHash` | `varchar(64)` | false | false |
| `OfflineOperationBinding.EnvelopeHash` | `varchar(64)` | false | false |
| `OfflineOperationBinding.EffectId` | `uniqueidentifier` | false | false |
| `RepairItem.Mode` | `tinyint` | false | false |
| `RepairItem.State` | `tinyint` | false | false |
| `RepairItem.CurrentBindingId` | `uniqueidentifier` | true | false |
| `RepairItem.CurrentAttemptId` | `uniqueidentifier` | true | false |
| `RepairItem.CurrentReviewId` | `uniqueidentifier` | true | false |
| `RepairItem.RowVersion` | `rowversion` | true | true |

## Selected indexes và SQL checks

Exact names/expressions from retained model. Filtered unique index != general uniqueness across history; constraints do not prove populated data passes upgrade.

| Table | Name | Columns/filter or SQL check |
|---|---|---|
| `Sessions` | `CK_Sessions_DeviceMetadataJson_Json` | `[DeviceMetadataJson] IS NULL OR ISJSON([DeviceMetadataJson]) = 1` |
| `Sessions` | `CK_Sessions_ExpiresAt` | `([Lifecycle] = 0 AND [ExpiresAt] IS NOT NULL AND [ExpiresAt] > [IssuedAt]) OR ([Lifecycle] = 1 AND [ExpiresAt] IS NULL AND [IssuedRole] IS NOT NULL)` |
| `Sessions` | `CK_Sessions_RevokedAt` | `[RevokedAt] IS NULL OR [RevokedAt] >= [IssuedAt]` |
| `Sessions` | `CK_Sessions_Transport` | `[Transport] IN (0, 1, 2)` |
| `FileScopes` | `UX_FileScopes_FileId` UNIQUE | `FileId` |
| `FileScopes` | `CK_FileScopes_PrivateShape` | `[ProjectId] IS NOT NULL OR ([Purpose] = 'REPORT_PHOTO' AND [TargetId] IS NULL)` |
| `UploadSessions` | `UX_UploadSessions_ObjectKey` UNIQUE | `ObjectKey` |
| `UploadSessions` | `CK_UploadSessions_ExpectedSizeBytes_Positive` | `[ExpectedSizeBytes] > 0` |
| `UploadSessions` | `CK_UploadSessions_PartSizeBytes_Positive` | `[PartSizeBytes] > 0` |
| `IdempotencyRecords` | `UX_IdempotencyRecords_ScopeKey` UNIQUE | `ActorUserId, ProjectId, Operation, IdempotencyKey` |
| `IdempotencyRecords` | `CK_IdempotencyRecords_OutcomeJson_Json` | `ISJSON([OutcomeJson]) = 1` |
| `RoadSectionVersions` | `UX_RoadSectionVersions_Current` UNIQUE | `RoadSectionId WHERE [IsCurrent] = 1` |
| `RoadSectionVersions` | `UX_RoadSectionVersions_RoadSectionId_VersionNo` UNIQUE | `RoadSectionId, VersionNo` |
| `RoadSectionVersions` | `CK_RoadSectionVersions_Geometry_AllowedSrid` | `([CrsProfileRevisionId] IS NULL AND [Geometry].STSrid IN (32648, 32649)) OR ([CrsProfileRevisionId] IS NOT NULL AND [Geometry].STSrid>=0)` |
| `RoadSectionVersions` | `CK_RoadSectionVersions_Geometry_LineString` | `[Geometry].STGeometryType() = 'LineString'` |
| `RoadSectionVersions` | `CK_RoadSectionVersions_VersionNo_Positive` | `[VersionNo] > 0` |
| `OfflineOperationBindings` | `IX_OfflineOperationBindings_EffectId` UNIQUE | `EffectId` |
| `OfflineOperationBindings` | `IX_OfflineOperationBindings_ProjectId_OriginId` UNIQUE | `ProjectId, OriginId` |
| `OfflineOperationBindings` | `CK_OfflineOperationBindings_CorePayloadHash` | `LEN([CorePayloadHash])=64 AND [CorePayloadHash] COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9a-f]%'` |
| `OfflineOperationBindings` | `CK_OfflineOperationBindings_EnvelopeHash` | `LEN([EnvelopeHash])=64 AND [EnvelopeHash] COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9a-f]%'` |
| `OfflineOperationBindings` | `CK_OfflineOperationBindings_EnvelopeJson` | `ISJSON([EnvelopeJson])=1` |
| `OfflineOperationBindings` | `CK_OfflineOperationBindings_RepairScope` | `([Kind] IN ('FIELD_ACCEPT','FIELD_START','FIELD_SUBMISSION') AND [RepairResourceId] IS NULL) OR ([Kind] IN ('REPAIR_ASSESSMENT','REPAIR_EXECUTION_START','REPAIR_EXECUTION_FINISH') AND [RepairResourceId] IS NOT NULL)` |

## Entity-to-table registry

All 196 EF metadata entries, including owned/table-sharing, are listed so a consumer can locate actual tables rather than infer them from prose. P/F/I/C = number of properties / foreign keys / indexes / checks on the **entity metadata** (not summed as physical counts). CLR declaration links are source locators; owned names retain EF identity when not a standalone declaration.

| EF entity | SQL table | P/F/I/C | CLR/source |
|---|---|---|---|
| `AccountStatusChangeLog` | `dbo.AccountStatusChangeLogs` | 10/2/3/5 | [AccountStatusChangeLog](../../../RoadGuardSystem.BusinessObjects/Identity/AccountStatusChangeLog.cs#L6) |
| `AIDetection` | `dbo.AIDetections` | 10/4/4/3 | [AIDetection](../../../RoadGuardSystem.BusinessObjects/Processing/AIDetection.cs#L6) |
| `AIModelVersion` | `dbo.AIModelVersions` | 9/1/3/4 | [AIModelVersion](../../../RoadGuardSystem.BusinessObjects/Processing/AIModelVersion.cs#L6) |
| `AiDetectionProvenance` | `dbo.Anh02AiDetectionProvenance` | 15/7/5/2 | [AiDetectionProvenance](../../../RoadGuardSystem.BusinessObjects/Processing/Anh02AiProvenance.cs#L45) |
| `AiManifestFileReference` | `dbo.Anh02AiManifestFiles` | 3/2/1/0 | [AiManifestFileReference](../../../RoadGuardSystem.BusinessObjects/Processing/Anh02AiProvenance.cs#L64) |
| `AiMockRun` | `dbo.Anh02AiMockRuns` | 24/9/10/4 | [AiMockRun](../../../RoadGuardSystem.BusinessObjects/Processing/Anh02AiProvenance.cs#L5) |
| `AiResultProvenance` | `dbo.Anh02AiResultProvenance` | 8/3/3/1 | [AiResultProvenance](../../../RoadGuardSystem.BusinessObjects/Processing/Anh02AiProvenance.cs#L33) |
| `ExportJob` | `dbo.Anh02ExportJobs` | 16/4/5/4 | [ExportJob](../../../RoadGuardSystem.BusinessObjects/Exports/ExportRecords.cs#L3) |
| `ExportSnapshotFile` | `dbo.Anh02ExportSnapshotFiles` | 9/2/2/1 | [ExportSnapshotFile](../../../RoadGuardSystem.BusinessObjects/Exports/ExportRecords.cs#L63) |
| `ExportSnapshot` | `dbo.Anh02ExportSnapshots` | 5/1/1/0 | [ExportSnapshot](../../../RoadGuardSystem.BusinessObjects/Exports/ExportRecords.cs#L48) |
| `GeneratedArtifact` | `dbo.Anh02GeneratedArtifacts` | 5/3/3/0 | [GeneratedArtifact](../../../RoadGuardSystem.BusinessObjects/Exports/ExportRecords.cs#L79) |
| `AuditLog` | `dbo.AuditLogs` | 11/1/4/2 | [AuditLog](../../../RoadGuardSystem.BusinessObjects/Auditing/AuditLog.cs#L5) |
| `BaselineCurrentPointer` | `dbo.BaselineCurrentPointers` | 8/2/2/0 | [BaselineCurrentPointer](../../../RoadGuardSystem.BusinessObjects/Surveys/DatasetAssessment.cs#L84) |
| `BaselineSelectionItem` | `dbo.BaselineSelectionItems` | 8/3/3/0 | [BaselineSelectionItem](../../../RoadGuardSystem.BusinessObjects/Surveys/DatasetAssessment.cs#L60) |
| `BaselineSelection` | `dbo.BaselineSelections` | 6/2/2/0 | [BaselineSelection](../../../RoadGuardSystem.BusinessObjects/Surveys/DatasetAssessment.cs#L47) |
| `BusinessDutyAppointment` | `dbo.BusinessDutyAppointments` | 7/3/3/0 | [BusinessDutyAppointment](../../../RoadGuardSystem.BusinessObjects/Clocks/BusinessReceivingRequest.cs#L84) |
| `BusinessReceivingRequest` | `dbo.BusinessReceivingRequests` | 17/3/4/1 | [BusinessReceivingRequest](../../../RoadGuardSystem.BusinessObjects/Clocks/BusinessReceivingRequest.cs#L5) |
| `HuyCandidateSourceHead` | `dbo.CandidateSourceHeads` | 5/2/2/0 | [HuyCandidateSourceHead](../../../RoadGuardSystem.Repositories/Models/Huy01/HuyIntegrationRows.cs#L33) |
| `HuyConclusionDefect` | `dbo.CaseConclusionDefects` | 2/2/1/0 | [HuyConclusionDefect](../../../RoadGuardSystem.Repositories/Models/Huy01/HuyIntegrationRows.cs#L57) |
| `HuyConclusionEvidence` | `dbo.CaseConclusionEvidence` | 5/2/1/1 | [HuyConclusionEvidence](../../../RoadGuardSystem.Repositories/Models/Huy01/HuyIntegrationRows.cs#L69) |
| `CaseConclusion` | `dbo.CaseConclusions` | 7/1/1/0 | [CaseConclusion](../../../RoadGuardSystem.BusinessObjects/Cases/CaseConclusion.cs#L3) |
| `HuyPublicationDefect` | `dbo.CasePublicationDefects` | 2/2/1/0 | [HuyPublicationDefect](../../../RoadGuardSystem.Repositories/Models/Huy01/HuyIntegrationRows.cs#L63) |
| `HuyPublicationEvidence` | `dbo.CasePublicationEvidence` | 6/2/1/1 | [HuyPublicationEvidence](../../../RoadGuardSystem.Repositories/Models/Huy01/HuyIntegrationRows.cs#L23) |
| `HuyPublicationRecipient` | `dbo.CasePublicationRecipients` | 2/2/1/0 | [HuyPublicationRecipient](../../../RoadGuardSystem.Repositories/Models/Huy01/HuyIntegrationRows.cs#L17) |
| `CasePublication` | `dbo.CasePublications` | 7/1/1/0 | [CasePublication](../../../RoadGuardSystem.BusinessObjects/Cases/CasePublication.cs#L3) |
| `CaseReportLinkHistory` | `dbo.CaseReportLinkHistory` | 7/3/3/0 | [CaseReportLinkHistory](../../../RoadGuardSystem.BusinessObjects/Cases/CaseReportLinkHistory.cs#L3) |
| `HuyLinkHistoryReport` | `dbo.CaseReportLinkHistoryReports` | 2/2/1/0 | [HuyLinkHistoryReport](../../../RoadGuardSystem.Repositories/Models/Huy01/HuyIntegrationRows.cs#L78) |
| `HuyCaseReportLink` | `dbo.CaseReportLinks` | 6/2/2/1 | [HuyCaseReportLink](../../../RoadGuardSystem.Repositories/Models/Huy01/HuyIntegrationRows.cs#L7) |
| `CauseCategory` | `dbo.CauseCategories` | 3/0/0/0 | [CauseCategory](../../../RoadGuardSystem.BusinessObjects/Catalogs/CauseCategory.cs#L3) |
| `ConsumerEffectReceipt` | `dbo.ConsumerEffectReceipts` | 5/1/1/0 | [ConsumerEffectReceipt](../../../RoadGuardSystem.BusinessObjects/Messaging/ConsumerEffectReceipt.cs#L3) |
| `CrsProfileRevision` | `dbo.CrsProfileRevisions` | 10/2/2/1 | [CrsProfileRevision](../../../RoadGuardSystem.BusinessObjects/Projects/CrsProfileRevision.cs#L3) |
| `DatasetAssessmentItem` | `dbo.DatasetAssessmentItems` | 11/2/2/1 | [DatasetAssessmentItem](../../../RoadGuardSystem.BusinessObjects/Surveys/DatasetAssessment.cs#L16) |
| `DatasetAssessment` | `dbo.DatasetAssessments` | 6/2/2/0 | [DatasetAssessment](../../../RoadGuardSystem.BusinessObjects/Surveys/DatasetAssessment.cs#L3) |
| `DeadlineBreach` | `dbo.DeadlineBreaches` | 4/1/1/1 | [DeadlineBreach](../../../RoadGuardSystem.BusinessObjects/Clocks/DeadlineClock.cs#L170) |
| `DeadlineClock` | `dbo.DeadlineClocks` | 15/3/5/3 | [DeadlineClock](../../../RoadGuardSystem.BusinessObjects/Clocks/DeadlineClock.cs#L12) |
| `DeadlineDutyAppointment` | `dbo.DeadlineDutyAppointments` | 8/3/3/0 | [DeadlineDutyAppointment](../../../RoadGuardSystem.BusinessObjects/Clocks/DeadlineClock.cs#L178) |
| `DeadlineExtension` | `dbo.DeadlineExtensions` | 8/2/2/1 | [DeadlineExtension](../../../RoadGuardSystem.BusinessObjects/Clocks/DeadlineClock.cs#L158) |
| `Defect` | `dbo.Defects` | 11/5/5/2 | [Defect](../../../RoadGuardSystem.BusinessObjects/Defects/Defect.cs#L8) |
| `HuyDefectSourceLink` | `dbo.DefectSourceLinks` | 11/5/7/1 | [HuyDefectSourceLink](../../../RoadGuardSystem.Repositories/Models/Huy01/HuyIntegrationRows.cs#L42) |
| `DefectStatisticsSource` | `dbo.DefectStatisticsSources` | 22/7/7/2 | [DefectStatisticsSource](../../../RoadGuardSystem.BusinessObjects/Reporting/DefectStatisticsSource.cs#L4) |
| `DefectType` | `dbo.DefectTypes` | 4/0/0/0 | [DefectType](../../../RoadGuardSystem.BusinessObjects/Catalogs/DefectType.cs#L3) |
| `DefectVerificationLog` | `dbo.DefectVerificationLogs` | 10/5/5/4 | [DefectVerificationLog](../../../RoadGuardSystem.BusinessObjects/Defects/DefectVerificationLog.cs#L6) |
| `DerivedMeasurement` | `dbo.DerivedMeasurements` | 12/2/2/6 | [DerivedMeasurement](../../../RoadGuardSystem.BusinessObjects/Processing/DerivedMeasurement.cs#L5) |
| `DroneDevice` | `dbo.DroneDevices` | 5/0/1/1 | [DroneDevice](../../../RoadGuardSystem.BusinessObjects/Devices/DroneDevice.cs#L5) |
| `FieldInspectionAssignment` | `dbo.FieldInspectionAssignments` | 8/3/3/3 | [FieldInspectionAssignment](../../../RoadGuardSystem.BusinessObjects/Inspections/FieldInspectionAssignment.cs#L5) |
| `FieldInspectionEvidenceLink` | `dbo.FieldInspectionEvidenceLinks` | 11/5/5/0 | [FieldInspectionEvidenceLink](../../../RoadGuardSystem.BusinessObjects/Inspections/FieldInspectionEvidenceLink.cs#L3) |
| `FieldInspectionEvidenceReuseDecision` | `dbo.FieldInspectionEvidenceReuseDecisions` | 11/4/4/0 | [FieldInspectionEvidenceReuseDecision](../../../RoadGuardSystem.BusinessObjects/Inspections/FieldInspectionEvidenceReuseDecision.cs#L3) |
| `FieldInspectionLocationProof` | `dbo.FieldInspectionLocationProofs` | 7/3/3/0 | [FieldInspectionLocationProof](../../../RoadGuardSystem.BusinessObjects/Inspections/FieldInspectionLocationProof.cs#L3) |
| `FieldInspectionOperationOrigin` | `dbo.FieldInspectionOperationOrigins` | 11/3/3/1 | [FieldInspectionOperationOrigin](../../../RoadGuardSystem.BusinessObjects/Inspections/FieldInspectionOperationOrigin.cs#L3) |
| `FieldInspectionReview` | `dbo.FieldInspectionReviews` | 9/4/4/0 | [FieldInspectionReview](../../../RoadGuardSystem.BusinessObjects/Inspections/FieldInspectionReview.cs#L3) |
| `FieldInspectionSession` | `dbo.FieldInspectionSessions` | 14/6/7/3 | [FieldInspectionSession](../../../RoadGuardSystem.BusinessObjects/Inspections/FieldInspectionSession.cs#L5) |
| `FieldInspectionSubmission` | `dbo.FieldInspectionSubmissions` | 17/8/9/0 | [FieldInspectionSubmission](../../../RoadGuardSystem.BusinessObjects/Inspections/FieldInspectionSubmission.cs#L3) |
| `FieldInspectionTaskEvent` | `dbo.FieldInspectionTaskEvents` | 11/6/6/0 | [FieldInspectionTaskEvent](../../../RoadGuardSystem.BusinessObjects/Inspections/FieldInspectionTaskEvent.cs#L3) |
| `FieldInspectionTask` | `dbo.FieldInspectionTasks` | 28/11/12/5 | [FieldInspectionTask](../../../RoadGuardSystem.BusinessObjects/Inspections/FieldInspectionTask.cs#L6) |
| `FieldTaskStartOrigin` | `dbo.FieldTaskStartOrigins` | 24/10/10/0 | [FieldTaskStartOrigin](../../../RoadGuardSystem.BusinessObjects/Inspections/FieldTaskStartOrigin.cs#L3) |
| `StoredFile` | `dbo.Files` | 9/1/2/2 | [StoredFile](../../../RoadGuardSystem.BusinessObjects/Files/StoredFile.cs#L3) |
| `FileScope` | `dbo.FileScopes` | 7/3/3/1 | [FileScope](../../../RoadGuardSystem.BusinessObjects/Files/FileScope.cs#L3) |
| `Flight` | `dbo.Flights` | 7/3/3/1 | [Flight](../../../RoadGuardSystem.BusinessObjects/Surveys/Flight.cs#L3) |
| `GeometryLocationImpactDecision` | `dbo.GeometryLocationImpactDecisions` | 7/2/2/1 | [GeometryLocationImpactDecision](../../../RoadGuardSystem.BusinessObjects/Projects/PavementPublication.cs#L45) |
| `GeometryLocationImpact` | `dbo.GeometryLocationImpacts` | 7/4/4/2 | [GeometryLocationImpact](../../../RoadGuardSystem.BusinessObjects/Projects/PavementPublication.cs#L34) |
| `GeometryMapPublication` | `dbo.GeometryMapPublications` | 11/6/6/2 | [GeometryMapPublication](../../../RoadGuardSystem.BusinessObjects/Projects/PavementPublication.cs#L19) |
| `GroundTruthMeasurement` | `dbo.GroundTruthMeasurements` | 22/5/5/5 | [GroundTruthMeasurement](../../../RoadGuardSystem.BusinessObjects/Inspections/GroundTruthMeasurement.cs#L6) |
| `H6NotificationAuditRow` | `dbo.H6NotificationAudits` | 12/4/5/0 | [H6NotificationAuditRow](../../../RoadGuardSystem.BusinessObjects/Messaging/H6NotificationPersistenceRecords.cs#L54) |
| `H6NotificationCalendarRow` | `dbo.H6NotificationCalendar` | 9/2/2/0 | [H6NotificationCalendarRow](../../../RoadGuardSystem.BusinessObjects/Messaging/H6NotificationPersistenceRecords.cs#L79) |
| `H6NotificationDeliveryRow` | `dbo.H6NotificationDeliveries` | 10/3/3/1 | [H6NotificationDeliveryRow](../../../RoadGuardSystem.BusinessObjects/Messaging/H6NotificationPersistenceRecords.cs#L20) |
| `H6NotificationDeliveryAttempt` | `dbo.H6NotificationDeliveryAttempts` | 5/1/1/0 | [H6NotificationDeliveryAttempt](../../../RoadGuardSystem.BusinessObjects/Messaging/H6NotificationPersistenceRecords.cs#L33) |
| `H6NotificationEventReceipt` | `dbo.H6NotificationEventReceipts` | 7/2/1/0 | [H6NotificationEventReceipt](../../../RoadGuardSystem.BusinessObjects/Messaging/H6NotificationPersistenceRecords.cs#L69) |
| `H6NotificationOccurrenceRow` | `dbo.H6NotificationOccurrences` | 12/2/3/2 | [H6NotificationOccurrenceRow](../../../RoadGuardSystem.BusinessObjects/Messaging/H6NotificationPersistenceRecords.cs#L5) |
| `H6NotificationScopeRow` | `dbo.H6NotificationScopes` | 10/4/3/0 | [H6NotificationScopeRow](../../../RoadGuardSystem.BusinessObjects/Messaging/H6NotificationPersistenceRecords.cs#L41) |
| `HandoverDocument` | `dbo.HandoverDocuments` | 8/3/3/0 | [HandoverDocument](../../../RoadGuardSystem.BusinessObjects/Projects/HandoverDocument.cs#L4) |
| `IdempotencyRecord` | `dbo.IdempotencyRecords` | 9/0/2/1 | [IdempotencyRecord](../../../RoadGuardSystem.BusinessObjects/Idempotency/IdempotencyRecord.cs#L6) |
| `IncidentCase` | `dbo.IncidentCases` | 13/3/3/1 | [IncidentCase](../../../RoadGuardSystem.BusinessObjects/Cases/IncidentCase.cs#L3) |
| `LD06ActionEvidence` | `dbo.LD06ActionEvidence` | 3/2/1/0 | [LD06ActionEvidence](../../../RoadGuardSystem.BusinessObjects/Projects/LD06LifecycleAction.cs#L91) |
| `LD06LifecycleAction` | `dbo.LD06LifecycleActions` | 14/8/8/1 | [LD06LifecycleAction](../../../RoadGuardSystem.BusinessObjects/Projects/LD06LifecycleAction.cs#L15) |
| `MeasurementValidationSample` | `dbo.MeasurementValidationSamples` | 8/3/3/2 | [MeasurementValidationSample](../../../RoadGuardSystem.BusinessObjects/Processing/MeasurementValidationSample.cs#L5) |
| `NativeRouteVersionFacts` | `dbo.NativeRouteVersionFacts` | 11/4/3/1 | [NativeRouteVersionFacts](../../../RoadGuardSystem.BusinessObjects/Projects/CrsProfileRevision.cs#L25) |
| `Notification` | `dbo.Notifications` | 10/1/3/0 | [Notification](../../../RoadGuardSystem.BusinessObjects/Messaging/Notification.cs#L3) |
| `ObligationResponsibility` | `dbo.ObligationResponsibilities` | 5/4/3/0 | [ObligationResponsibility](../../../RoadGuardSystem.BusinessObjects/Projects/LD06LifecycleAction.cs#L78) |
| `OfflineAdmittedFileReference` | `dbo.OfflineAdmittedFileReferences` | 15/9/10/2 | [OfflineAdmittedFileReference](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineAdmittedFileReference.cs#L4) |
| `OfflineDeviceRegistration` | `dbo.OfflineDeviceRegistrations` | 10/2/3/2 | [OfflineDeviceRegistration](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineDeviceRegistration.cs#L5) |
| `OfflineDeviceRevocation` | `dbo.OfflineDeviceRevocations` | 6/3/4/0 | [OfflineDeviceRevocation](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineDeviceRegistration.cs#L40) |
| `OfflineEncryptedCaptureArtifact` | `dbo.OfflineEncryptedCaptureArtifacts` | 18/6/7/6 | [OfflineEncryptedCaptureArtifact](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineEncryptedCaptureArtifact.cs#L8) |
| `OfflineEncryptedPackageRecord` | `dbo.OfflineEncryptedPackages` | 14/4/4/5 | [OfflineEncryptedPackageRecord](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineEncryptedPackageRecord.cs#L5) |
| `OfflineEvidenceCaptureReference` | `dbo.OfflineEvidenceCaptureReferences` | 17/9/10/2 | [OfflineEvidenceCaptureReference](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineEvidenceCaptureReference.cs#L4) |
| `OfflineHandoverGrantRevocation` | `dbo.OfflineHandoverGrantRevocations` | 6/3/4/0 | [OfflineHandoverGrantRevocation](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineHandoverGrantRevocation.cs#L3) |
| `OfflineHandoverGrant` | `dbo.OfflineHandoverGrants` | 14/7/7/3 | [OfflineHandoverGrant](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineHandoverGrant.cs#L6) |
| `OfflineOperationAdmission` | `dbo.OfflineOperationAdmissions` | 10/5/6/2 | [OfflineOperationAdmission](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineOperationAdmission.cs#L6) |
| `OfflineOperationBinding` | `dbo.OfflineOperationBindings` | 15/7/8/4 | [OfflineOperationBinding](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineOperationBinding.cs#L7) |
| `OfflineOperationResult` | `dbo.OfflineOperationResults` | 16/3/3/3 | [OfflineOperationResult](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineOperationResult.cs#L4) |
| `OfflineOriginTimeVerification` | `dbo.OfflineOriginTimeVerifications` | 10/4/5/1 | [OfflineOriginTimeVerification](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineOriginTimeVerification.cs#L4) |
| `OfflinePackageFileReference` | `dbo.OfflinePackageFileReferences` | 6/3/4/2 | [OfflinePackageFileReference](../../../RoadGuardSystem.BusinessObjects/Offline/OfflinePackageFileReference.cs#L3) |
| `OfflineSyncBatch` | `dbo.OfflineSyncBatches` | 15/6/6/4 | [OfflineSyncBatch](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineSyncBatch.cs#L3) |
| `OfflineTaskSnapshot` | `dbo.OfflineTaskSnapshots` | 11/5/5/3 | [OfflineTaskSnapshot](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineTaskSnapshot.cs#L3) |
| `OutboxMessage` | `dbo.OutboxMessages` | 13/0/3/3 | [OutboxMessage](../../../RoadGuardSystem.BusinessObjects/Messaging/OutboxMessage.cs#L7) |
| `PasswordRecoveryRequest` | `dbo.PasswordRecoveryRequests` | 4/1/1/0 | [PasswordRecoveryRequest](../../../RoadGuardSystem.BusinessObjects/Identity/PasswordRecoveryRequest.cs#L3) |
| `PasswordResetLog` | `dbo.PasswordResetLogs` | 8/2/3/3 | [PasswordResetLog](../../../RoadGuardSystem.BusinessObjects/Identity/PasswordResetLog.cs#L6) |
| `PavementLayoutRevision` | `dbo.PavementLayoutRevisions` | 12/6/6/2 | [PavementLayoutRevision](../../../RoadGuardSystem.BusinessObjects/Projects/PavementPublication.cs#L3) |
| `PavementSourceFileReference` | `dbo.PavementSourceFileReferences` | 5/2/2/1 | [PavementSourceFileReference](../../../RoadGuardSystem.BusinessObjects/Projects/PavementPublication.cs#L56) |
| `ProcessingAttempt` | `dbo.ProcessingAttempts` | 7/1/2/3 | [ProcessingAttempt](../../../RoadGuardSystem.BusinessObjects/Processing/ProcessingAttempt.cs#L5) |
| `ProcessingBlock` | `dbo.ProcessingBlocks` | 4/1/1/2 | [ProcessingBlock](../../../RoadGuardSystem.BusinessObjects/Processing/ProcessingBlock.cs#L5) |
| `ProcessingJob` | `dbo.ProcessingJobs` | 13/2/3/2 | [ProcessingJob](../../../RoadGuardSystem.BusinessObjects/Processing/ProcessingJob.cs#L6) |
| `ProjectLifecycleHistoryRecord` | `dbo.ProjectLifecycleHistory` | 16/7/7/2 | [ProjectLifecycleHistoryRecord](../../../RoadGuardSystem.BusinessObjects/Projects/ProjectLifecycleHistoryRecord.cs#L12) |
| `ProjectMember` | `dbo.ProjectMembers` | 9/3/4/3 | [ProjectMember](../../../RoadGuardSystem.BusinessObjects/Projects/ProjectMember.cs#L5) |
| `Project` | `dbo.Projects` | 10/0/1/3 | [Project](../../../RoadGuardSystem.BusinessObjects/Projects/Project.cs#L5) |
| `QualityCheck` | `dbo.QualityChecks` | 13/3/3/9 | [QualityCheck](../../../RoadGuardSystem.BusinessObjects/Surveys/QualityCheck.cs#L6) |
| `RefreshToken` | `dbo.RefreshTokens` | 6/1/2/1 | [RefreshToken](../../../RoadGuardSystem.BusinessObjects/Identity/RefreshToken.cs#L5) |
| `RepairActualScope` | `dbo.RepairActualScopes` | 9/2/2/0 | [RepairActualScope](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairWork.cs#L18) |
| `RepairAssessmentEvidenceReference` | `dbo.RepairAssessmentEvidence` | 14/5/5/0 | [RepairAssessmentEvidenceReference](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairProducerSources.cs#L29) |
| `RepairAssessmentMeasurementReference` | `dbo.RepairAssessmentMeasurements` | 2/2/1/0 | [RepairAssessmentMeasurementReference](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairProducerSources.cs#L28) |
| `Evidence#RepairEvidenceReference` | `dbo.RepairAttemptEvidence` | 12/2/1/0 | [RepairEvidenceReference](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairWork.cs#L127) |
| `RepairAttemptReview` | `dbo.RepairAttemptReviews` | 18/7/7/0 | [RepairAttemptReview](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairProducerSources.cs#L49) |
| `RepairAttempt` | `dbo.RepairAttempts` | 19/7/7/0 | [RepairAttempt](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairWork.cs#L143) |
| `RepairAttemptSubmissionLink` | `dbo.RepairAttemptSubmissionLinks` | 13/9/9/0 | [RepairAttemptSubmissionLink](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairProducerSources.cs#L45) |
| `Evidence#RepairEvidenceReference` | `dbo.RepairCorrectionEvidence` | 12/2/1/0 | [RepairEvidenceReference](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairWork.cs#L127) |
| `RepairDangerAcknowledgement` | `dbo.RepairDangerAcknowledgements` | 7/3/3/0 | [RepairDangerAcknowledgement](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairSafetyMonitoring.cs#L19) |
| `RepairDangerWarning` | `dbo.RepairDangerWarnings` | 7/2/2/0 | [RepairDangerWarning](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairSafetyMonitoring.cs#L14) |
| `RepairCorrectionBasis` | `dbo.RepairDecisions` | 2/1/0/0 | [RepairCorrectionBasis](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairCorrectionBehavior.cs#L5) |
| `RepairDecision` | `dbo.RepairDecisions` | 12/6/6/0 | [RepairDecision](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairWork.cs#L130) |
| `RepairEligibilityAssessment` | `dbo.RepairEligibilityAssessments` | 14/6/6/0 | [RepairEligibilityAssessment](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairProducerSources.cs#L67) |
| `RepairEligibilityHandoverSource` | `dbo.RepairEligibilityHandoverSources` | 6/3/2/0 | [RepairEligibilityHandoverSource](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairProducerSources.cs#L81) |
| `RepairEligibilityWarrantySource` | `dbo.RepairEligibilityWarrantySources` | 6/3/2/0 | [RepairEligibilityWarrantySource](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairProducerSources.cs#L79) |
| `RepairExecutionAuthorization` | `dbo.RepairExecutionAuthorizations` | 20/7/7/0 | [RepairExecutionAuthorization](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairPolicyAndAuthorization.cs#L108) |
| `RepairExecutionFinish` | `dbo.RepairExecutionFinishes` | 14/6/6/0 | [RepairExecutionFinish](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairProducerSources.cs#L39) |
| `RepairExecutionStart` | `dbo.RepairExecutionStarts` | 18/8/8/0 | [RepairExecutionStart](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairProducerSources.cs#L34) |
| `RepairFieldTaskBinding` | `dbo.RepairFieldTaskBindings` | 26/15/15/0 | [RepairFieldTaskBinding](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairProducerSources.cs#L7) |
| `RepairItemLifecycleEvent` | `dbo.RepairItemLifecycleEvents` | 17/10/10/0 | [RepairItemLifecycleEvent](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairProducerSources.cs#L55) |
| `RepairItem` | `dbo.RepairItems` | 36/16/16/0 | [RepairItem](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairWork.cs#L229) |
| `RepairMeasurementAssessment` | `dbo.RepairMeasurementAssessments` | 20/10/10/0 | [RepairMeasurementAssessment](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairProducerSources.cs#L15) |
| `RepairNormalSuccessor` | `dbo.RepairNormalSuccessors` | 12/9/9/0 | [RepairNormalSuccessor](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairProducerSources.cs#L61) |
| `RepairObligationResolutionEvent` | `dbo.RepairObligationResolutionEvents` | 6/4/3/0 | [RepairObligationResolutionEvent](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairWork.cs#L12) |
| `RepairObligation` | `dbo.RepairObligations` | 11/7/7/0 | [RepairObligation](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairWork.cs#L68) |
| `RepairPackage` | `dbo.RepairPackages` | 6/2/2/0 | [RepairPackage](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairPackage.cs#L4) |
| `RepairPolicyDraftChange` | `dbo.RepairPolicyDraftChanges` | 9/2/2/0 | [RepairPolicyDraftChange](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairPolicyDraft.cs#L5) |
| `RepairPolicyDraft` | `dbo.RepairPolicyDrafts` | 5/3/3/0 | [RepairPolicyDraft](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairPolicyDraft.cs#L9) |
| `RepairMeasurementRule` | `dbo.RepairPolicyMeasurementRules` | 5/1/0/0 | [RepairMeasurementRule](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairPolicyAndAuthorization.cs#L16) |
| `RepairPolicyRevision` | `dbo.RepairPolicyRevisions` | 8/2/2/0 | [RepairPolicyRevision](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairPolicyAndAuthorization.cs#L25) |
| `RepairPolicyRevocation` | `dbo.RepairPolicyRevocations` | 5/2/2/0 | [RepairPolicyRevocation](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairPolicyAndAuthorization.cs#L18) |
| `RepairReviewRequest` | `dbo.RepairReviewRequests` | 8/4/4/0 | [RepairReviewRequest](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairCorrectionBehavior.cs#L29) |
| `RepairSafetyActionSource` | `dbo.RepairSafetyActionSources` | 10/5/5/0 | [RepairSafetyActionSource](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairSafetyActionSource.cs#L3) |
| `RepairSafetyEvidenceReference` | `dbo.RepairSafetyCheckEvidence` | 13/3/2/0 | [RepairSafetyEvidenceReference](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairSafetyMonitoring.cs#L4) |
| `RepairSafetyCheck` | `dbo.RepairSafetyChecks` | 7/3/2/0 | [RepairSafetyCheck](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairSafetyMonitoring.cs#L7) |
| `RepairSafetyMonitoring` | `dbo.RepairSafetyMonitoring` | 6/4/4/0 | [RepairSafetyMonitoring](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairSafetyMonitoring.cs#L26) |
| `SafetyResponsibilityTransfer` | `dbo.RepairSafetyResponsibilityTransfers` | 8/4/3/0 | [SafetyResponsibilityTransfer](../../../RoadGuardSystem.BusinessObjects/Repairs/TemporarySafetyMeasure.cs#L3) |
| `TemporarySafetyMeasure` | `dbo.RepairTemporarySafetyMeasures` | 14/6/6/0 | [TemporarySafetyMeasure](../../../RoadGuardSystem.BusinessObjects/Repairs/TemporarySafetyMeasure.cs#L8) |
| `RepairWorkHandover` | `dbo.RepairWorkHandovers` | 7/3/3/0 | [RepairWorkHandover](../../../RoadGuardSystem.BusinessObjects/Repairs/RepairWork.cs#L129) |
| `ReporterRegistrationIntent` | `dbo.ReporterRegistrationIntents` | 13/1/2/1 | [ReporterRegistrationIntent](../../../RoadGuardSystem.BusinessObjects/Identity/ReporterRegistrationIntent.cs#L5) |
| `OriginalEvidence#ReportEvidence` | `dbo.ReportOriginalEvidence` | 7/4/4/1 | [ReportEvidence](../../../RoadGuardSystem.BusinessObjects/Reports/ReportEvidence.cs#L3) |
| `CaptureMetadata#EvidenceCaptureMetadata` | `dbo.ReportOriginalEvidence` | 6/1/0/0 | [EvidenceCaptureMetadata](../../../RoadGuardSystem.BusinessObjects/Reports/EvidenceCaptureMetadata.cs#L3) |
| `Report` | `dbo.Reports` | 6/1/1/0 | [Report](../../../RoadGuardSystem.BusinessObjects/Reports/Report.cs#L3) |
| `Evidence#ReportEvidence` | `dbo.ReportSupplementEvidence` | 7/4/5/1 | [ReportEvidence](../../../RoadGuardSystem.BusinessObjects/Reports/ReportEvidence.cs#L3) |
| `CaptureMetadata#EvidenceCaptureMetadata` | `dbo.ReportSupplementEvidence` | 6/1/0/0 | [EvidenceCaptureMetadata](../../../RoadGuardSystem.BusinessObjects/Reports/EvidenceCaptureMetadata.cs#L3) |
| `ReportSupplement` | `dbo.ReportSupplements` | 4/1/1/0 | [ReportSupplement](../../../RoadGuardSystem.BusinessObjects/Reports/ReportSupplement.cs#L3) |
| `RetentionBasisHead` | `dbo.RetentionBasisHeads` | 4/2/1/0 | [RetentionBasisHead](../../../RoadGuardSystem.BusinessObjects/Retention/RetentionRecords.cs#L3) |
| `RetentionBasisRevision` | `dbo.RetentionBasisRevisions` | 12/3/3/1 | [RetentionBasisRevision](../../../RoadGuardSystem.BusinessObjects/Retention/RetentionRecords.cs#L10) |
| `RetentionEvaluationItem` | `dbo.RetentionEvaluationItems` | 10/2/2/1 | [RetentionEvaluationItem](../../../RoadGuardSystem.BusinessObjects/Retention/RetentionRecords.cs#L60) |
| `RetentionEvaluation` | `dbo.RetentionEvaluations` | 9/2/3/1 | [RetentionEvaluation](../../../RoadGuardSystem.BusinessObjects/Retention/RetentionRecords.cs#L47) |
| `RetentionHoldHistory` | `dbo.RetentionHoldHistories` | 6/2/2/1 | [RetentionHoldHistory](../../../RoadGuardSystem.BusinessObjects/Retention/RetentionRecords.cs#L38) |
| `RetentionHold` | `dbo.RetentionHolds` | 10/2/3/1 | [RetentionHold](../../../RoadGuardSystem.BusinessObjects/Retention/RetentionRecords.cs#L25) |
| `RoadCoverageMapping` | `dbo.RoadCoverageMappings` | 24/8/8/2 | [RoadCoverageMapping](../../../RoadGuardSystem.BusinessObjects/Repairs/RoadCoverageMapping.cs#L5) |
| `RoadGeometryDraft` | `dbo.RoadGeometryDrafts` | 14/2/2/0 | [RoadGeometryDraft](../../../RoadGuardSystem.BusinessObjects/Projects/RoadGeometryDraft.cs#L3) |
| `RoadGeometryMetadata` | `dbo.RoadGeometryMetadata` | 7/2/1/0 | [RoadGeometryMetadata](../../../RoadGuardSystem.BusinessObjects/Projects/RoadGeometryMetadata.cs#L3) |
| `RoadRouteSystem` | `dbo.RoadRouteSystems` | 4/1/1/0 | [RoadRouteSystem](../../../RoadGuardSystem.BusinessObjects/Projects/CrsProfileRevision.cs#L17) |
| `RoadSection` | `dbo.RoadSections` | 4/1/1/0 | [RoadSection](../../../RoadGuardSystem.BusinessObjects/Projects/RoadSection.cs#L3) |
| `RoadSectionVersion` | `dbo.RoadSectionVersions` | 8/2/3/3 | [RoadSectionVersion](../../../RoadGuardSystem.BusinessObjects/Projects/RoadSectionVersion.cs#L5) |
| `RoadSegment` | `dbo.RoadSegments` | 9/2/3/1 | [RoadSegment](../../../RoadGuardSystem.BusinessObjects/Projects/RoadSegment.cs#L3) |
| `RoadSegmentSet` | `dbo.RoadSegmentSets` | 8/1/2/1 | [RoadSegmentSet](../../../RoadGuardSystem.BusinessObjects/Projects/RoadSegmentSet.cs#L3) |
| `ApplicationRole` | `dbo.Roles` | 5/0/0/0 | [ApplicationRole](../../../RoadGuardSystem.BusinessObjects/Identity/ApplicationRole.cs#L11) |
| `UserSession` | `dbo.Sessions` | 11/1/1/4 | [UserSession](../../../RoadGuardSystem.BusinessObjects/Identity/UserSession.cs#L6) |
| `SeverityRuleVersion` | `dbo.SeverityRuleVersions` | 7/0/1/3 | [SeverityRuleVersion](../../../RoadGuardSystem.BusinessObjects/Catalogs/SeverityRuleVersion.cs#L5) |
| `CandidateClassification` | `dbo.SourceDecisions` | 6/5/4/0 | [CandidateClassification](../../../RoadGuardSystem.BusinessObjects/Candidates/CandidateClassification.cs#L5) |
| `CandidateDecision` | `dbo.SourceDecisions` | 16/6/6/1 | [CandidateDecision](../../../RoadGuardSystem.BusinessObjects/Candidates/CandidateDecision.cs#L3) |
| `CandidateSourceIdentity` | `dbo.SourceDecisions` | 4/1/0/0 | [CandidateSourceIdentity](../../../RoadGuardSystem.BusinessObjects/Candidates/CandidateSourceIdentity.cs#L3) |
| `StaffInvitationProject` | `dbo.StaffInvitationProjects` | 2/2/1/0 | [StaffInvitationProject](../../../RoadGuardSystem.BusinessObjects/Identity/StaffInvitationProject.cs#L3) |
| `StaffInvitation` | `dbo.StaffInvitations` | 12/1/3/0 | [StaffInvitation](../../../RoadGuardSystem.BusinessObjects/Identity/StaffInvitation.cs#L5) |
| `SupplementarySurveyRequest` | `dbo.SupplementarySurveyRequests` | 11/4/4/4 | [SupplementarySurveyRequest](../../../RoadGuardSystem.BusinessObjects/Surveys/SupplementarySurveyRequest.cs#L6) |
| `SurveyAssignment` | `dbo.SurveyAssignments` | 10/3/4/5 | [SurveyAssignment](../../../RoadGuardSystem.BusinessObjects/Surveys/SurveyAssignment.cs#L3) |
| `SurveyDataVersion` | `dbo.SurveyDataVersions` | 14/1/1/5 | [SurveyDataVersion](../../../RoadGuardSystem.BusinessObjects/Surveys/SurveyDataVersion.cs#L6) |
| `SurveyFile` | `dbo.SurveyFiles` | 9/3/3/4 | [SurveyFile](../../../RoadGuardSystem.BusinessObjects/Surveys/SurveyFile.cs#L5) |
| `SurveyPlanPostponement` | `dbo.SurveyPlanPostponements` | 5/1/1/0 | [SurveyPlanPostponement](../../../RoadGuardSystem.BusinessObjects/Surveys/SurveyPlanPostponement.cs#L3) |
| `SurveyPlan` | `dbo.SurveyPlans` | 11/3/4/4 | [SurveyPlan](../../../RoadGuardSystem.BusinessObjects/Surveys/SurveyPlan.cs#L6) |
| `SurveyPlanScope` | `dbo.SurveyPlanScopes` | 6/2/2/1 | [SurveyPlanScope](../../../RoadGuardSystem.BusinessObjects/Surveys/SurveyPlanScope.cs#L5) |
| `SurveyRequest` | `dbo.SurveyRequests` | 17/7/7/4 | [SurveyRequest](../../../RoadGuardSystem.BusinessObjects/Surveys/SurveyRequest.cs#L6) |
| `SurveyRequestScope` | `dbo.SurveyRequestScopes` | 6/2/2/1 | [SurveyRequestScope](../../../RoadGuardSystem.BusinessObjects/Surveys/SurveyRequestScope.cs#L5) |
| `Survey` | `dbo.Surveys` | 9/4/4/3 | [Survey](../../../RoadGuardSystem.BusinessObjects/Surveys/Survey.cs#L5) |
| `HuyTrainingLabelReview` | `dbo.TrainingLabelReviews` | 7/2/3/1 | [HuyTrainingLabelReview](../../../RoadGuardSystem.Repositories/Models/Huy01/HuyTrainingLabelRows.cs#L33) |
| `HuyTrainingLabelRevision` | `dbo.TrainingLabelRevisions` | 13/3/3/1 | [HuyTrainingLabelRevision](../../../RoadGuardSystem.Repositories/Models/Huy01/HuyTrainingLabelRows.cs#L16) |
| `HuyTrainingLabelHead` | `dbo.TrainingLabels` | 9/3/3/1 | [HuyTrainingLabelHead](../../../RoadGuardSystem.Repositories/Models/Huy01/HuyTrainingLabelRows.cs#L3) |
| `UploadMultipartSweep` | `dbo.UploadMultipartSweeps` | 2/1/1/0 | [UploadMultipartSweep](../../../RoadGuardSystem.Repositories/Models/UploadMultipartSweep.cs#L7) |
| `UploadPart` | `dbo.UploadParts` | 6/1/1/0 | [UploadPart](../../../RoadGuardSystem.BusinessObjects/Files/UploadPart.cs#L3) |
| `UploadSession` | `dbo.UploadSessions` | 18/2/5/2 | [UploadSession](../../../RoadGuardSystem.BusinessObjects/Files/UploadSession.cs#L5) |
| `ApplicationUser` | `dbo.Users` | 23/1/4/1 | [ApplicationUser](../../../RoadGuardSystem.BusinessObjects/Identity/ApplicationUser.cs#L12) |
| `ValidationRun` | `dbo.ValidationRuns` | 15/1/2/3 | [ValidationRun](../../../RoadGuardSystem.BusinessObjects/Processing/ValidationRun.cs#L6) |
| `Warranty` | `dbo.Warranties` | 12/4/4/5 | [Warranty](../../../RoadGuardSystem.BusinessObjects/Warranties/Warranty.cs#L5) |
| `WeeklyReviewDigestDuty` | `dbo.WeeklyReviewDigestDuties` | 7/2/1/0 | [WeeklyReviewDigestDuty](../../../RoadGuardSystem.BusinessObjects/Messaging/WeeklyReviewDigest.cs#L26) |
| `WeeklyReviewDigest` | `dbo.WeeklyReviewDigests` | 8/3/3/0 | [WeeklyReviewDigest](../../../RoadGuardSystem.BusinessObjects/Messaging/WeeklyReviewDigest.cs#L14) |
| `WeeklyReviewRecoveryPeriod` | `dbo.WeeklyReviewRecoveryPeriods` | 5/1/1/0 | [WeeklyReviewRecoveryPeriod](../../../RoadGuardSystem.BusinessObjects/Messaging/WeeklyReviewDigest.cs#L6) |

## GAPs và consumer boundaries

**PARTIAL**: exact model/source verified, live schema/upgrade/backup/query performance NOT_VERIFIED (P1-05). P1-03 location/matching facts and P2-07 localized producer limitation remain, not cured by nullable FK guesses. Source history does not certify AI physical dimensions or real device time. [All ten workflows](../02_Business-Workflows/README.md) define authority; model structure does not decide business policy.

## Source evidence và verification boundary

Symbol/line dưới đây tại `1b577d703cda203c6066eba98ff005341739849e`. Partial declarations được bổ sung bằng method locator; không coi một interface/DI entry là bằng chứng mọi runtime branch đã chạy.

- [RoadGuardDbContext](../../../RoadGuardSystem.Repositories/RoadGuardDbContext.cs#L35): source declaration.
- [RowVersionConvention](../../../RoadGuardSystem.Repositories/Concurrency/RowVersionConvention.cs#L5): source declaration.
- [UserSessionConfiguration](../../../RoadGuardSystem.Repositories/Configurations/UserSessionConfiguration.cs#L7): source declaration.
- [FileScopeConfiguration](../../../RoadGuardSystem.Repositories/Configurations/FileScopeConfiguration.cs#L9): source declaration.
- [UploadSessionConfiguration](../../../RoadGuardSystem.Repositories/Configurations/UploadSessionConfiguration.cs#L8): source declaration.
- [RoadSectionVersionConfiguration](../../../RoadGuardSystem.Repositories/Configurations/RoadSectionVersionConfiguration.cs#L8): source declaration.
- [IdempotencyRecordConfiguration](../../../RoadGuardSystem.Repositories/Configurations/IdempotencyRecordConfiguration.cs#L7): source declaration.
- [RoadGuardDbContext.OnModelCreating](../../../RoadGuardSystem.Repositories/RoadGuardDbContext.cs#L181): method source.

Business/SQL/HTTP/native/external tests Phase 2B **NOT_RUN** (docs-only). Fresh static link/reference/hash/diff checks nằm trong [review report](PHASE2B_REVIEW_REPORT.md). Test source/checkpoint cũ chỉ `HISTORICAL` theo revision, không runtime PASS mới. Independent JEV **PENDING**.
