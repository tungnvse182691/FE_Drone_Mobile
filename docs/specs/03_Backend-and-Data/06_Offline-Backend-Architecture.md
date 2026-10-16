# Offline backend: keys, snapshots, signed sync và handover

**Phase 2B · 15/10/2026 · source pin `1b577d703cda203c6066eba98ff005341739849e` · independent JEV review pending.**

[Canonical entrance](../README.md) · [Phase 2A workflows (owner PASS)](../02_Business-Workflows/README.md) · [Phase 2B review](PHASE2B_REVIEW_REPORT.md) · [Open status/GAP registry](../00_Governance/03_Implementation-and-Verification-Status.md).

`CURRENT_VERIFIED` ở đây = observed source/static metadata, không deployed acceptance. Owner decisions và latest [HUY specification](../../../planning/development/HUY-FINAL-INTEGRATION.md) xác định `TARGET_CONFIRMED`; [confirmed decisions](../../product/confirmed-decisions.md) giữ qualifiers. `PROPOSED`, `HISTORICAL`, `NOT_VERIFIED` theo [authority/legend](../00_Governance/01_Authority-and-Source-of-Truth.md). Phase 0 model/API capture được dùng sau recheck 1334 source hashes, không gọi SQL hay tuyên bố fresh runtime capture. Technical identifiers RoadGuardSystem và routes hiện hữu được giữ; product HoangHaiWarrantySystem, Supervisor/PM Web, Reporter/Operator/Crew Mobile React Native Expo.

## Actors, supported commands và admission

Backend signed offline is for currently authorized PM/Crew commands in canonical registry. Crew consumer Mobile Expo; PM Web role may enroll/use supported registry source but that doesn't verify a browser crypto adapter. Supervisor issues/revokes handover grants/prepares package per OfflineWorkflowService gate. Reporter online MVP and Operator survey are not automatically admitted because all are Mobile users. Enrollment is not a general login prerequisite.

Offline snapshot/grant retains source at capture; every sync still needs current registration/user/role/membership/assignment/source and command-specific guard. Unknown command kind/unsupported payload never gets a generic last-write-wins database write. Direct original actor and imported recipient/admission are distinct.

## Key custody and canonical protocol

Client generates ECDSA P-256 signing and ECDH P-256 encryption keys; sends public SPKI DER Base64 plus actor/device identity to register. Backend persists public keys/revision/content hash and revocation facts; **server does not issue/custody/recover private keys** from this flow. OfflineDeviceKeys is .NET reference crypto implementation, not evidence Expo/Android Keystore/native code exists.

Canonical manifest/descriptors/core+envelope hashes bind project, batch/source device, origin/actor/task/snapshot/typed content under exact algorithms. Signatures use ECDSA P-256, SHA256/domain-bound canonical bytes and IEEE-P1363 format (fixed64 signature shape); do not sign arbitrary pretty-printed JSON or use ETag/K as signature. Encryption and signing keys have separate purposes. Key possession/content binding does not prove a person, device hardware trust, GPS accuracy, measured dimensions or historic UTC.

## Snapshot → local operation → batch → receipt

1. Register device online, capture current snapshot/task/source versions and store original pins. Snapshot isn't a server grant to mutate forever or bypass future revocation.
2. Client creates supported operation retaining original actor/origin/first-start/parent lineage, task/snapshot/geometry refs, typed core/envelope hashes and verified artifact refs. Capture/file upload admission is separate, not bytes embedded magically in a sync ACK.
3. ProcessBatchAsync bounds 1..1000 items. Initial currentGuard/source registration/import transport + canonical signature/manifest/content identity + snapshot staging may reject whole batch before effects. Same batch/origin changed content conflicts.
4. Per-item transaction rechecks admission and uses command registry/persistence receipt for durable effect. Unique `(ProjectId, OriginId)` binding and effect/receipt protect original identity; rerun cannot replace original actor/source. Batch HTTP200 is transport success, not all-item success.
5. Caller reconciles exact durable accepted/replayed ACK identity/hash and pending/conflict result using batch/origin reads. No blanket delete of queue/files, no automatic newest-version overwrite. Lost server ACK after commit requires receipt/replay, not a fresh origin. Some early batch guards fail before any per-item partial outcome.
6. Start reconciliation preserves first-start and uncertainty/current source; signature claimed time doesn't allow backdating. ND01 FT original24h window/current conservative server admission applies; additional post-expiry data remains deferred, no origin reset.

## Scoped handover

Supervisor grant binds source/recipient devices/current authority/scope and expiry/revoke history. Package prepare/export/import uses canonical source/recipient signatures and encrypted package/artifact identity; recipient import still retains original Crew actor/lineage and supported command authority. Immutable transferred files/measurements aren't rewritten as the recipient's capture. Registry key revocation/assignment/source changes affect replay/import; grant possession is not a blanket project access token.

OfflineSyncBatch, OfflineOperationBinding, OfflineSnapshot, device registration, grant/package/artifact/admission records persist provenance and scoped FKs. Exact model is in [data chapter](02_Domain-and-Data-Model.md); packet field/schema stays current DTO/controller/index, not invented protocol here. See [18 actual offline API operations](../02_Business-Workflows/09_Offline-Snapshots-Sync-and-Handover.md) for method/path/version/DTO references; upload endpoints have separate purpose/admission.

## Conflicts, key loss và local encryption

Signature/canonical hash failure, wrong/revoked source device, expired/revoked grant, unsupported action, source/membership/assignment/head change or unverified artifact blocks effect. Per-item successful transaction needn't rollback because another later item conflicts; initial guards can reject full batch. Server won't resolve conflict by choosing client wall clock. Reassignment/supplement/handover don't reset formal first-intake/business clock.

Lost private key, app uninstall or replaced device can strand unsynced data. Public-key registration cannot decrypt local files or reconstruct private key. Re-enroll is new registration, not recovery of old authority; recovery/escrow/backup policy is not automatically implemented. Consumer must warn/handle risk under approved policy; native UI/architecture outside this phase.

FE SQLite/SQLCipher-equivalent, files/cache/thumbnails/queue encryption, secure keys and queue durability remain consumer work PROPOSED/NOT_VERIFIED. Encrypted backend handover doesn't prove local-at-rest encryption or hardware-backed key custody. No native adapter/storage implementation is generated here.

## JEV and verification boundary

**PARTIAL**: backend canonical registry/device/snapshot/signature/handover/current-rights sources exist; actual Expo crypto interop/kill/restart/disk-full/corrupt file/key-loss acceptance P1-05 NOT_VERIFIED. Signed time isn't historic UTC proof; no client bypass for NORMAL/FT roles. P1/P2 remain open in registry; no source changes. Related [FIELD](../02_Business-Workflows/06_FIELD-Inspection-and-Measurements.md), [NORMAL](../02_Business-Workflows/07_NORMAL-Repair-and-Acceptance.md), [FT](../02_Business-Workflows/08_FastTrack-Policy-and-Confirmation.md), [offline workflow](../02_Business-Workflows/09_Offline-Snapshots-Sync-and-Handover.md).

## Source evidence và verification boundary

Symbol/line dưới đây tại `1b577d703cda203c6066eba98ff005341739849e`. Partial declarations được bổ sung bằng method locator; không coi một interface/DI entry là bằng chứng mọi runtime branch đã chạy.

- [OfflineWorkflowController](../../../RoadGuardSystem.API/Controllers/OfflineWorkflowController.cs#L14): source declaration.
- [OfflineWorkflowService](../../../RoadGuardSystem.Services/Implementations/Offline/OfflineWorkflowService.cs#L8): source declaration.
- [OfflineWorkflowRepository](../../../RoadGuardSystem.Repositories/Implementations/Offline/OfflineWorkflowRepository.Sync.cs#L13): source declaration.
- [OfflineDeviceKeys](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineDeviceKeys.cs#L6): source declaration.
- [OfflineDevicePublicKeys](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineCryptoFormat.cs#L160): source declaration.
- [OfflineWorkflowAlgorithms](../../../RoadGuardSystem.Repositories/Interfaces/Offline/IOfflineWorkflowRepository.cs#L7): source declaration.
- [OfflinePackageAuthentication](../../../RoadGuardSystem.BusinessObjects/Offline/OfflinePackageAuthentication.cs#L9): source declaration.
- [OfflineAdmissionValidator](../../../RoadGuardSystem.Repositories/Implementations/Offline/OfflineAdmissionValidator.cs#L19): source declaration.
- [OfflineSyncBatch](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineSyncBatch.cs#L3): source declaration.
- [OfflineOperationBinding](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineOperationBinding.cs#L7): source declaration.
- [OfflineHandoverGrant](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineHandoverGrant.cs#L6): source declaration.
- [OfflineEncryptedPackageRecord](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineEncryptedPackageRecord.cs#L5): source declaration.
- [OfflineDeviceKeys.Generate](../../../RoadGuardSystem.BusinessObjects/Offline/OfflineDeviceKeys.cs#L14): method source.
- [OfflineWorkflowRepository.RegisterDeviceAsync](../../../RoadGuardSystem.Repositories/Implementations/Offline/OfflineWorkflowRepository.cs#L299): method source.
- [OfflineWorkflowRepository.ProcessBatchAsync](../../../RoadGuardSystem.Repositories/Implementations/Offline/OfflineWorkflowRepository.Sync.cs#L25): method source.

Business/SQL/HTTP/native/external tests Phase 2B **NOT_RUN** (docs-only). Fresh static link/reference/hash/diff checks nằm trong [review report](PHASE2B_REVIEW_REPORT.md). Test source/checkpoint cũ chỉ `HISTORICAL` theo revision, không runtime PASS mới. Independent JEV **PENDING**.
