# Operator: cold start with API unavailable

Mode: IMPLEMENT_AND_SELF_REVIEW (Codex). Base FE main `77ba041cf1454e44d6a222c8993ebf2b93699c79`.
BE inspected read-only at `85879fe9082774cf5098a9ba281f56b9c651f8ea`; no BE source, schema or fixture changes.

## Requirement and source

Owner asked to fix inability to read downloaded content after restarting without connectivity.
Compared current BE `AuthController.AndroidRefresh` (refresh token plus operation key, server session authority),
`docs/HoangHaiWarrantySystem-Official/06_Mobile-Expo/Operator/03_Task-Dataset-and-Error-Handling.md`
(network loss resumes protected operations online; no claim of Operator signed offline sync),
and FE governance retained decision 43A (downloaded task/route/segment/destination).

Root cause: cold restore correctly requires HTTP refresh, but the recovery overlay provided no local reading surface.
Persisted user identity alone must not unlock authenticated routes or commands.

## Change

- Recovery offers **Xem nhiệm vụ đã tải** for Operator. Separate local read surface shows cached task code,
  historical status, segment count and download timestamp. It does not navigate into authenticated task screens.
- SecureStore envelope supplies only the exact actor/environment/session partition. No access token is persisted,
  generated or restored locally; no refresh token is returned to the view. Pending refresh body/key are untouched.
- SQLite snapshots are projected to display fields; versions/ETags and command payloads are not exposed.
  Invalid rows, wrong actor/session/environment and mismatched resource keys are excluded.
- Auth changes invalidate ongoing reads and close the local surface. Android Back returns to recovery.
- No new dependency, native configuration, API, permission, queue dispatch or SQL mutation against BE.

## Executed verification

- Regression first failed: `localIdentity is not a function`; implementation added, then secure-session tests passed.
- `npm run typecheck`: exit 0.
- `node --test tests/*.test.cjs`: **1669/1669 passed**, 0 failures, 68228 ms.
  Local output `.cache/offline-cold-full-regression-final.log` (not committed).
- Includes actual auth-store local partition test: remains tokenless/authReady=false, preserves pending rotation,
  rejects other actor and Reporter role. Snapshot tests cover stale session/environment, corrupt rows, resource
  substitution, deduplication and account change during awaited SQLite read.
- `git diff --check`: clean. Changed source checked for secrets, unsupported icon imports and financial UI.

## ANDROID_E2E_VERIFIED — bounded scenario

Pixel_6_Pro / emulator-5554, Android 14, Expo Go, Metro 8090; existing Operator A session.
Docker API `roadguard-crew-sandbox-api-1`, image `crew-85879fe`.

1. Online task list already downloaded through existing authorized GET/cache flow.
2. Stopped only API container, force-stopped Expo Go, reopened app. Recovery offers local tasks.
3. Opened local tasks: real cached tasks include parent `031e423d`, child `4a230453`, `9cb55c3f`, `c35a0c8c`;
   labels and original timestamps displayed, no command controls.
4. Turned off both Android Wi-Fi and mobile data, force-stopped and reopened again through localhost Metro/ADB.
   Opened local task list successfully. Screenshot inspected; initial dark background error fixed to design-token
   white surface and inspected again. Evidence `.cache/roadguard-offline-cold-view.png` (not committed).
5. Hardware Back returned to session recovery. Restarted API, enabled Wi-Fi/data, confirmed API healthy.
6. Tapped **Thử lại**: session refreshed and Operator home/list/navigation returned without password entry.

No upload/dataset/task mutation was submitted by this local-view checkpoint. Existing pending data were preserved.

## Limits

This checkpoint repairs **cold-start access to the downloaded task list only**. It is not offline authenticated
execution, detailed route/map browsing, draft editing or offline command submission. Those capabilities are not
asserted by this result. Account-switch boundaries here are LOGIC_TESTED; a second-account Android walkthrough
was not performed in this checkpoint. Storage encryption/native signer acceptance and full three-role regression
on Android are separate. No BE addition is required for this bounded local read fix.
