# Private photo upload

The Reporter upload is a private `REPORT_PHOTO` multipart workflow. It is separate from project video/SRT/GPS upload and separate from Crew offline evidence. Exact DTO schemas are in [API contracts](../../04_API-Contracts/02_Full-API-Catalog.md) and [DTO reference](../../04_API-Contracts/03_DTO-and-Schema-Reference.md).

## Sequence

1. Request camera/library and optional location permission. If location is unavailable, use `locationSource=UNKNOWN`; do not invent coordinates or claim server capture time. Normalize the final bytes before calculating size and lowercase SHA-256.
2. API-211 `POST /api/v1/reporter-evidence/uploads` with bearer, required `Idempotency-Key`, `ReporterEvidenceCreateRequestDto` (`fileName`, `mediaType`, `sizeBytes`, `checksumSha256`). Current source admission is JPEG/PNG and 20 MiB maximum; FE must read response/config rather than hard-code undocumented limits.
3. API-214 `POST /api/v1/reporter-evidence/uploads/{uploadId}/part-urls` with bearer and K. Use returned part URLs and expirations. Upload raw bytes to the storage URL; do not attach the RoadGuard bearer token to it. Capture each storage ETag exactly.
4. API-212 `GET /api/v1/reporter-evidence/uploads/{uploadId}` is the recovery read. API-213 `POST /api/v1/reporter-evidence/uploads/{uploadId}/complete` sends `CompletedUploadPartDto[]` and whole-file checksum with K and the upload's strong `If-Match`.
5. Completion is asynchronous/accepted. It does **not** mean the file is `VERIFIED`. Poll API-212/API-208 `GET /api/v1/reporter-evidence/files/{fileId}` with bounded backoff while foreground. Stop on `VERIFIED`, `FAILED`, expiry or cancellation. The production verification worker and real object storage are not verified here.
6. Only after every selected file is `VERIFIED` and its current file version is known may the app call API-216 Create Report. Store upload session IDs, file IDs, checksum, part ETags and version in a protected, account-partitioned local queue.

## Retry and security

Keep the same K and exact payload for an uncertain API-211/API-213/API-214/API-216 response. A presigned URL expiry requires a new URL command according to the current session/version contract; it is not permission to replay arbitrary bytes with a new identity. Never put bearer tokens, presigned URLs, raw image bytes, EXIF or GPS in logs/analytics. Strip EXIF only if product policy accepts that loss; otherwise preserve the declared metadata and label it as client-provided.

Private file metadata and content are owner-scoped. API-208/209 are Reporter bearer routes; API-210 requires an explicit publication/report/evidence tuple. A 404/403 is a privacy outcome, not a reason to fall back to a public URL. P1-04 remains open: source review found a possible post-storage-await authorization revalidation gap; this package does not claim it is fixed.

**Evidence:** `ReporterEvidenceController`, `ReporterEvidenceService`, upload DTOs, `UploadAdmissionPolicy`, and API-208/API-209/API-211–214 catalog entries. Byte/provider/native upload and Android tests are `NOT_VERIFIED_EXPO_E2E`.
