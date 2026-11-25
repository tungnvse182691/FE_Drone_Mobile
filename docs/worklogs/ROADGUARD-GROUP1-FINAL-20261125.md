# ROADGUARD GROUP1 FINAL â€” execution checkpoints

Mode: Codex IMPLEMENT_AND_SELF_REVIEW. Branch main; no push. Independent review not performed.

## BE deployment
Official `8d7595afa5caed33f4c71834d3d8c6d796568c7b`; local merged develop `b8f718dd372b9aa8b2923045fdcd82dd0e5e0583`.
Image `roadguard-crew-sandbox-api:develop-8d7595a`, health HTTP 200. Rollback `develop-b891e88` retained.
Owner explicitly authorized two additive migrations: ReportMatchingLocationConfirmation and TemporarySafetyResolution. Applied official EF statements; 15 migration entries. Existing-column fingerprints across 197 business tables, MinIO digest and dependency container identities unchanged. No reset/seed.
Evidence: `.cache/offline-session-20261124/group1-deployment-result.json`, `group1-migration-applied.log`, `group1-contract-ci.json`. CI NOT_VERIFIED (GitHub API 504 / prior credentials 401). Android API health 200; Android API and MinIO real HTTP 200 (device shell TCP HTTP probes); details in group1-android-preflight.json.

## Canonical size compatibility
FE base f3b14f3. Official evidence DTO nullable long and JsonIgnore extracted with per-file source hash in tests/c10-reference/provenance.json. Null/omitted size preserves legacy bytes/core hash; present size checked against source-derived .NET oracle in FIELD and REPAIR.
PROTOCOL_INTEROP_TESTED: node --test tests/c10a.test.cjs, 24/24. npm run typecheck PASS. Full baseline plus canonical regression: node --test tests/*.test.cjs, 2222/2222, 165187 ms. Log `.cache/offline-session-20261124/group1-canonical-regression.log`. git diff --check PASS. This evidence predates admission continuation edits and does not verify them.

## Admission / FIELD / REPAIR / Android
IN_PROGRESS. Source extends the existing encrypted draft/vault, immutable journal and multipart uploader. Transport mapping is separate from signed bytes, every resume rechecks authenticated origin lineage; uncertain create recovers original upload/file IDs. FIELD local accept/start is persisted and signed together with submission, allowing one outage without inventing authority. Signed local photos are protected atomically against deletion/replacement and normal upload adoption. REPAIR assessment accepts sealed local evidence; start verifies receipt and resolved file lineage. Sync resumes only pending evidence members and retains partial receipts.

UI: removed raw draft UUID; admission transport commands excluded from task KPI; pending evidence distinguishes upload/verification. Signed editor does not offer ordinary pre-sign upload. Existing tokens/components retained; Android UI acceptance NOT_RUN.

Self-review: updated existing fixtures to exercise actual SQLite journal/media locks and admission through shipped multipart uploader; targeted media 31/31, uploader 48/48. Typecheck PASS after final CTA adjustment. Full regression before that JSX-only adjustment passed 2233/2233; subsequent concurrent build/regression encountered host memory exhaustion (LLVM out of memory and Node process crash). This failed run is not a logic PASS. Serial full regression completed 2232/2233, sole failure was the prior signed-editor ordinary-upload expectation (crew-field-feedback-state). That expectation was updated to the requested admission flow and the complete file rerun passed 18/18 in 8865ms. Other 2215 cases passed the full run without cancellations. This is composed full-suite evidence, not a single all-green invocation. Build retries use QA-only compiler/Metro concurrency limits. No production gate/config/dependency changes.

HTTP_VERIFIED read: dedicated FIELD NewAssigned and two NORMAL REPAIR Assigned fixtures belong to authorized Crew (group1-crew-fixture-readback.json). No repair business mutation yet. Android API/MinIO both 200 from emulator; source APK not installed yet. FIELD and three REPAIR operations, restart/fault matrix and cold-start editing remain NOT_RUN. Existing drafts, journals, media and build outputs retained.

Artifacts to retain: deployment/canonical evidence above; group1-android-preflight.json, group1-crew-fixture-readback.json, group1-field-fixture-journal.json, group1-repair-discovery.json, group1-before.png; latest successful APK plus existing storage-resume-normal.apk rollback. Superseded QA logs (group1-admission-regression.log, group1-source-final-regression.log, group1-android-build.log) are diagnostic only; no deletion authorized or performed.

Cold-start source review: src/store/auth.ts starts without token and restores through real Android refresh; app/_layout.tsx exposes LocalSavedDrafts while restore fails, without mounting authenticated role routes. No approved local unlock/expiry authority found. A local signed editing policy requires an owner decision on device authentication, TTL, revocation and session binding; dispatch must still require current authentication. BLOCKED_POLICY applies only to cold signed creation, not warm offline acceptance.
