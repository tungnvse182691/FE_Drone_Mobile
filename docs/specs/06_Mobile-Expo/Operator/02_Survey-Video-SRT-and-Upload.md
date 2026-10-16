# Survey video, SRT and upload

The supported source chain is PM plan/task → current Operator assignment → verified `SURVEY_VIDEO` and `TELEMETRY` files → dataset submission. API-229 does not authorize an unverified upload or a task from another project.

## Multipart sequence

1. Read API-225/226 and verify assignment, task status and version.
2. Create each purpose-specific upload with API-233 `POST /api/v1/uploads`; use the exact `UploadCreateRequestDto` from the catalog, checksum and declared media metadata. Do not set server `VERIFIED`.
3. Request part URLs with API-236. Upload bytes to returned presigned URLs and retain each returned ETag; ETag is not the complete SHA-256.
4. Complete with API-235 and current upload version/part list. A `202`/accepted result means verification intent only.
5. Poll API-234 until the server reports `VERIFIED` or a terminal failure. A worker/provider deployment is not proven by the route existing.
6. Submit API-229 with verified file IDs, task/dataset version, scope and telemetry binding. Preserve K and exact body on timeout.

Video, SRT and GPS are distinct evidence. An absent SRT/GPS file is not a coverage PASS. The app must not fabricate timestamps, route pins, model results or physical measurements. No DJI SDK or automatic telemetry integration is source-verified.

## Client responsibilities

Validate file URI accessibility, size/checksum before upload, foreground/background permission prompts, resumable part state and redacted logs. Store presigned URLs only in protected short-lived memory/queue records. Reconcile an unknown complete by GET status before creating another upload. `CURRENT_IMPLEMENTED_BE` is the Backend contract; upload byte transfer and native file handling are `PROPOSED_EXPO`/`NOT_VERIFIED_EXPO_E2E`.

Evidence: [upload contract](../../04_API-Contracts/06_File-Upload-and-Evidence-Contracts.md), [survey workflow](../../02_Business-Workflows/05_Drone-Survey-Dataset-and-Processing.md), API-225–236 crosswalk.
