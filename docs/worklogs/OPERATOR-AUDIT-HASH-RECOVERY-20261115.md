# Operator audit and interrupted checksum recovery — 2026-11-15

Mode: IMPLEMENT_AND_SELF_REVIEW (Codex self-review; no independent reviewer).
Baseline FE: 2341d99e104f65ee0edbb213692f228baf8ec9a3.
BE remote develop: 85879fe9082774cf5098a9ba281f56b9c651f8ea, refetched this session.
Environment: roadguard-crew-sandbox-api:crew-85879fe, API 18181; Pixel_6_Pro Android 14, Expo Go, Metro 8090.

## Fixed in this checkpoint

- Expo's default file stream reads 1024 bytes per native call. A 51,449,564-byte QA video exposed excessive checksum processing. Read at most 256 KiB per call, with incremental SHA-256, size checks, handle cleanup and session guards.
- A force-stop during checksum leaves the complete private file discoverable as LOCAL_UNHASHED. The saved-file action now finishes its checksum from those retained bytes before selecting it; no additional picker/copy/upload is needed.
- Retain the busy lock until the old operation settles, including across session changes. Do not publish a late result into a new session.
- Apply the same 256 KiB native-read limit when assembling one multipart range. Android reached 16% on the original range reader but was very slow; this change limits the size of each native crossing without changing upload parts or their identity.

## Executed evidence

- LOGIC_TESTED: red/green tests for bounded native checksum/multipart reads, reference SHA-256 parity, session changes, restart recovery without another copy and UI action locking. Targeted 37/37 passed (`.cache/operator-rehash-green.log`).
- Full regression: `node --test tests/*.test.cjs`, 1680/1680 passed, 68392.2636 ms (`.cache/operator-final-regression-20261115.log`).
- `npm run typecheck`: exit 0 (`.cache/operator-final-typecheck.log`). `git diff --check`: exit 0.
- ANDROID_E2E_VERIFIED for checksum recovery only: after force-stop/reopen, selected the retained QA-operator-interruption-20261115.mp4 (51,449,564 bytes) previously showing unverified local checksum. Observed it selected with 49.1 MB and “Đã kiểm tra SHA-256”; saved the draft, force-stopped/reopened and observed the same selected file, checksum label, drone and recordedAt. No storage reset or SQLite changes on device. Node reference-vector parity is separate from this native observation.
- The QA video is synthetic and does not demonstrate real flight, GPS or survey coverage.
- Additional Android interruption audit: started sending that QA video, disabled WiFi/data, observed “Cần tiếp tục gửi”; restored network and force-stopped/reopened. The selected file, checksum label, device and recordedAt survived. Resumed from this task's upload screen, not a historical unknown command. Transfer reached 16%; after the multipart-read change, reopened and resumed again, also reached 16%. Full completion/VERIFIED/dataset readback for this large file is NOT_RUN to completion; performance remains unresolved. MinIO health from Android's 10.0.2.2:19101 returned HTTP 200. Do not claim the bounded-read change resolves total transfer latency. Network is restored and the app remains on the QA transfer screen.

## Current API audit

HTTP_VERIFIED read-only audit (`.cache/operator-current-audit-20261115.json`): 19 QA task details, work packages, eligible-drone lists and geometry packages returned 200; each geometry had two WGS84 segments. Two tasks no longer assigned to this Operator returned 403 access_forbidden. Dataset 2e58588b-2a9e-4002-a5b9-b6cc4d199538 and its file metadata were readable; metadata VERIFIED. Coverage returned UNKNOWN / coverage-not-evaluated.v1. This is a supported fallback when no assessment exists, not proof of a missing coverage API.

BE_DISCOVERY_GAP: parent task 031e423d-20e7-4c35-a814-582e3a8751e9 is SUPPLEMENT_REQUIRED, but GET task still returns supplementTaskId null after child 4a230453-2292-44fd-9f53-6e18b57c8a89 was created. Current SurveyV2PersistenceService sets SupplementTaskId in the supplement mutation response, while ordinary ToTaskView does not reconstruct that relation. Request a persistent/discoverable relation in API-226/list so Operator can reopen the correct supplemental task after restart. Do not infer links from similar names or dates.

## Remaining FE work / limits

- Cold local surface supports downloaded task summaries and draft metadata editing. It does not yet expose file picking or offline map rendering there. Authenticated upload file preservation supports cached task provenance; that is a different entry point.
- API-237 cancel has a real wrapper and tested workflow but no active screen caller. This remains FE integration work, not a BE API gap.
- Sync reads queue state; it does not itself dispatch the complete multipart upload workflow or demonstrate background auto-resume.
- Complete interrupted multipart transfer, completion/readback, SRT pairing and account-switch scenarios need their own Android acceptance. Do not infer these from 1679 Node tests or from checksum recovery.
- BE/Candidate3 source unchanged; existing pending commands, journals and media retained.
