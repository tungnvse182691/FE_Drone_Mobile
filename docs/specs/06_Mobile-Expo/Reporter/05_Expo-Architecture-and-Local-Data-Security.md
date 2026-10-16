# Expo architecture and local data security

## Proposed client layers

`PROPOSED_EXPO_UI`: navigation/auth boundary → typed API client → bearer/session interceptor → feature repositories → protected draft/upload queue → screens. Keep Reporter, account and upload data partitioned by authoritative user ID. API client must preserve exact method/path, request DTO, `Idempotency-Key`, `If-Match`, response ETag and correlation ID from the catalog.

Use Expo camera/image-picker/location permissions only at the edge. Normalize final file bytes before upload. Use SecureStore or an equivalent OS protected secret facility for refresh tokens and encryption key material. Access tokens should be memory-first. Do not use AsyncStorage/plain SQLite for tokens, raw private photos, presigned URLs or unredacted ProblemDetails.

## Local data policy

The Backend’s encrypted handover/storage does not prove that an Expo SQLite database, thumbnails, cache or file URI is encrypted on the device. SQLCipher/equivalent database encryption, encrypted files, key generation, biometric/device binding, migration, backup exclusion and uninstall behavior are **PROPOSED / NOT_VERIFIED_EXPO_E2E** and require a mobile architecture decision. If the MVP is online-only, minimize local persistence and delete temporary bytes after the server has accepted and the UI no longer needs them.

Logout must revoke the server session through API-007 and clear access/refresh secrets, cached own projections and temporary media according to an owner-approved retention policy. Do not silently delete an unsent report/draft; present the user with its state and recovery choice. Device loss, uninstall and app reinstall are not a Crew enrollment/key-loss workflow for Reporter.

## Offline boundary

Reporter MVP may retain a protected pending queue for network retry, but it does not use Crew device enrollment, signed canonical batches, snapshots, per-item receipts or ECDSA. Offline report creation semantics, conflict policy and durable encrypted queue are not source-confirmed; mark them `SOURCE_GAP` until the owner defines them. Online API idempotency and resumable upload recovery remain the supported boundary.

**Evidence:** Phase 2B offline/security chapters, `ReporterEvidenceService`, `AuthService` and the source handoff. No Expo repository/native module/deployed device was supplied.
