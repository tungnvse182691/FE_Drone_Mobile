# Enrollment & Snapshot — Android QA checkpoint (2026-11-25)

Mode: IMPLEMENT_AND_SELF_REVIEW. Parent baseline main@5421895. BE runtime b891e88; API sandbox 18181. No push.

## Usable workflow

Crew opens the dedicated FIELD task 5772ff9f-b6dd-48c5-b7dc-5dbf679aca59 and presses **Tải dữ liệu nhiệm vụ**. The handler persists immutable enrollment/snapshot intents before POST, reads each resource back through API-117/API-128, validates ownership/source, then records RECONCILED. No mount mutation. Resource uniqueness is enforced inside the exclusive SQLite transaction. Busy/session/unmount guards preserve existing behavior.

Verified local snapshot receipts can now supply signing preparation without new device/snapshot GET calls. This is preparation only; offline FIELD navigation/producer/dispatch acceptance remains the next checkpoint.

## Executed evidence

- Android: emulator-5554 / Pixel_6_Pro, com.hoanghai.roadguard. Actual UI login, dedicated task detail, download button, success message, then Sync showing enrollment + task data RECONCILED (2 saved, 0 pending, 2 confirmed).
- App handler success requires real API-116 POST, API-117 GET, API-127 POST, API-128 GET; no runtime mocks. Task was still NewAssigned; this test did not accept/start/submit it.
- Force-stop ONLY RoadGuard, start MainActivity, session restored, Sync still shows the two confirmed records. This demonstrates encrypted journal persistence across process restart, not complete offline FIELD acceptance.
- Additional independent GET API-117: HTTP 200, registration 45a5b889-4bf4-43f8-943e-af30567530bb, device d0acc197-435a-4d15-aedf-d80c8decd1ed, expected project/role/key fields and not revoked. See .cache/offline-session-20261124/enrollment-registration-readback.json (no credentials).
- Screenshot: .cache/offline-session-20261124/enrollment-android.png; restart: enrollment-restart.png.
- Prior unchanged-source TypeScript: exit 0, enrollment-tsc.log. Full regression: 2153 passed / 0 failed, enrollment-full-final.log. No repeated full run for QA-only packaging changes.
- git diff --check: exit 0 (line-ending warnings only). AndroidRuntime inspected window: no RoadGuard FATAL EXCEPTION found; not a comprehensive historical log claim.

## Native QA artifact and connection

Latest APK remains android/app/build/outputs/apk/release/app-release.apk (no extra APK copy).
SHA256 FE9883461BE646E5166BBB6D0A327A07099149D45F0963B2078E9379F3BF9F19.
QA only: release embedded bundle with debuggable manifest, separate QA signing aliases, emulator + exact loopback sandbox checks. SOFTWARE accepted only in this isolated QA path. NATIVE_ACCEPTANCE_VERIFIED stays false; production TEE/StrongBox requirements are unchanged.

The QA manifest initially omitted HTTP permission. Cache-only Gradle init/source overlay adds a network-security domain exception for 10.0.2.2 only; base cleartext remains false. No tracked app config/dependency changes. Final packaging log: crew-qa-network-package-final.log, BUILD SUCCESSFUL. adb install -r: Success; app data retained.

API host is now http://10.0.2.2:18181/api/v1. Android toybox nc (-q 3) health returned HTTP 200; host health HTTP 200. Host is part of journal partition and native binding, so 127.0.0.1 and 10.0.2.2 do NOT share journal/session authority. Old data is retained, never moved, adopted or deleted. Cross-host recovery is not claimed.

## Artifact retention / cleanup proposal (NO deletion performed)

Keep current build-output APK and existing verified rollback storage-resume-normal.apk; keep the existing build cache, init scripts and qa-network overlay required to reproduce this exact QA artifact. Keep the two screenshots, registration readback, fixture journal, final package log, typecheck/full-regression evidence and historical pending media/journals/databases.

Earlier unsuccessful/obsolete packaging logs (crew-qa-network-package.log, previous localhost host build logs) are diagnostic only and are not current acceptance proof; they are candidates for owner-approved cleanup. No files were removed. No APK/cache/build/.cxx/log artifacts are staged.

## Limits / next

ANDROID_E2E_VERIFIED for enrollment/snapshot download and restart persistence; HTTP_VERIFIED for the invoked source readbacks, plus independent registration readback. This does not prove local task navigation, signed FIELD operation creation/sending, evidence upload, 42A, all-role offline or production hardware acceptance. Expo Go/iOS are not covered. Continue FIELD offline next.
