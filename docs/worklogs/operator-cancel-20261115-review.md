# Operator upload cancellation — 2026-11-15

Mode: IMPLEMENT_AND_SELF_REVIEW; reviewer: Codex. Base FE 39eb32d; BE origin/develop 85879fe9082774cf5098a9ba281f56b9c651f8ea. Scope: API-237, cooperative upload pause, durable cancellation state and native confirmation. No backend edits.

## Contract and corrections

API-237 returns UploadCancelResponseDto (id, status, failureCode). API-234 returns UploadSessionResponseDto without failureCode. Native testing exposed an incorrect FE requirement for failureCode in API-234. Fixed: require the cancellation reason in API-237's receipt, then matching ID and FAILED in API-234. A red test with the actual DTO failed before the fix.

Persist UNKNOWN before cancellation transport. Only confirm after matching receipt and authorized readback. Timeout retains UNKNOWN; 409 reads current status and never claims cancelled. Cancel and transfer share a task/scope lock. Pause waits for an in-flight part to finish and preserves successful part receipts. Confirmed cancellation preserves history and permits a later explicit new upload attempt. No original, draft, journal or SQLite deletion.

## Executed verification

- `npm run typecheck`: exit 0.
- `node --test tests/master-drone-contract.test.cjs tests/package6-drone-journal.test.cjs tests/operator-storage-transfer.test.cjs`: 43/43 pass.
- `node --test tests/*.test.cjs`: 1688/1688 pass, zero fail.
- `git diff --check`: clean.
- Android Pixel_6_Pro / Expo Go / Metro 8090, existing private QA task 9cb55c3f…: preserved the 49.1 MB source, saved draft, began upload, pressed Dừng tải lên at 0%. One completed part remained. Native confirmation appeared before API-237. First readback exposed the DTO bug; exact same session was explicitly reconciled after correction. UI showed Máy chủ đã xác nhận hủy and Đã hủy phiên tải lên. This success path requires API-237 HTTP 200 and API-234 HTTP 200 matching FAILED; no replacement upload/session was created during reconciliation.
- Local screenshot evidence: `.cache/operator-cancel-confirm.png`, `.cache/operator-cancel-confirmed.png`. Full IDs stay in sandbox/local evidence; no signed URL/token logging added. Temporary diagnostic printed only error code and was removed.
- Native 409, concurrent cancel/resume and session switch NOT_RUN in this checkpoint; logic tests cover unknown/mismatch/409 and preserved part resume. No Android PASS inferred from Node.

## Dataset readback from prior video checkpoint

Read-only verification script `.cache/operator-dataset-readback.py`: API-026 dataset e50b0b34… HTTP 200, task 4a230453… and submitting actor match; source file 0980c9c5… linked to upload 37e01557…. API-234 and API-029 both HTTP 200 / VERIFIED. Size 51,449,564 bytes and SHA-256 match the original Android file. Coverage HTTP 200 / UNKNOWN, not coverage PASS. Actual storage 403 response body was not captured, so root cause remains unproven.

Offline file/map and Sync dispatch acceptance remain separate work. No push authorized.
