# Operator video recovery — 2026-11-15

- Reviewer: Codex; mode: IMPLEMENT_AND_SELF_REVIEW.
- Base FE: fb0e379; BE: 85879fe9082774cf5098a9ba281f56b9c651f8ea.
- Scope: multipart transport, expiring part URL admissions, retained upload recovery and error subtitle. No BE changes.

## Finding and fix

The private QA video (51,449,564 bytes) retained four successful parts. Storage returned 403 while API-234 still returned UPLOADING. FE had recorded a terminal FAILED state. The exact storage XML error was not captured; expired URLs are supported by timing and BE source, not proven by XML.

Recover that specific historical storage failure only after authorized session readback. Keep the upload identity and successful part ETags. Persist each URL admission generation before POST, renew expiring URLs, and retain immutable completion requests. Use the installed Expo binary fetch transport instead of React Native XHR Uint8Array base64 conversion. Reset the progress subtitle when an operation stops.

## Executed evidence

- LOGIC_TESTED: `node --test tests/*.test.cjs` — 1,684 passed, zero failed.
- `npm run typecheck` — exit 0.
- `git diff --check` — clean.
- ANDROID_E2E_VERIFIED: Pixel_6_Pro / Expo Go / Metro 8090; Operator private QA task 4a230453-2292-44fd-9f53-6e18b57c8a89. Resumed at 65%, completed remaining video parts, verified metadata, submitted dataset and passed authorized dataset/task/coverage readback in confirmDataset. Screen showed “Đã gửi dữ liệu”.
- HTTP_VERIFIED read: API-234 upload 37e01557-d6d9-47ef-b1fb-d649a2a28c8e — HTTP 200, VERIFIED, failureCode null.
- UI screenshot reviewed: success card text fits, readback button visible, navigation unobstructed.
- Source scan: no added credential logging, icons or financial UI.

## Limits

This verifies recovery of this interrupted video, not every upload failure or full offline acceptance. API-237 UI, Sync recovery and cold offline file/map work remain separate checkpoints. Dataset receipt does not imply coverage PASS. No native signer/provider changes.
