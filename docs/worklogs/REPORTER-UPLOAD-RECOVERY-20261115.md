# Reporter upload recovery — 2026-11-15

Reviewer: Codex. Mode: IMPLEMENT_AND_SELF_REVIEW (not independent review).
FE baseline: `9789b34a543b4f19da9debd3ea7ec832591ffc13`; changes include `fe46d8b`, `5b1442c` and the accompanying supplement UI checkpoint.
BE source: `85879fe9082774cf5098a9ba281f56b9c651f8ea`, API sandbox port 18181; Android emulator-5554, Expo Go.

## Changes

- Report and supplement buttons describe the actual upload, verification, submit or readback phase. Active retries take precedence over previous upload diagnostics.
- An expired part URL is replaced using a newly persisted URL command key. Upload/file identity and previously acknowledged part ETags are retained. Storage 403 is distinguished from Reporter permission failure.
- Frozen supplements show a read-only content summary. Photo add/remove controls are hidden; failures appear in a bounded notice above the submit button.
- No BE source changes, SQL mutations, historical session rebinding or journal/media deletion.

## Executed checks

- `node --test tests/reporter-upload-expiry.test.cjs`: 8 passed. Includes known-part preservation, mismatched/failed/expired session rejection and rejection of an already expired replacement URL.
- Frozen supplement regression: reproduced failure before implementation; final `node --test tests/reporter-retry-status.test.cjs`: 11 passed.
- `node --test tests/*.test.cjs`: 1,630 passed, zero failed/skipped; log `.cache/reporter-edge-20261114/full-ui-final.log`.
- `npx tsc --noEmit`: exit 0. `git diff --check`: exit 0.

## Android and HTTP evidence

Report fixture `fc2a1220-a633-4330-9a76-e127c319e311` is dedicated QA data owned by Reporter A.

- Initial creation and first supplement completed through Android and real object storage. File/session reads returned VERIFIED. First supplement readback: two evidence entries, one supplement.
- Second supplement upload began at 01:20:38 UTC+7. Network was disabled at 01:21:05 and restored at 01:25:49, after original URL expiration at 01:25:39. Retry at 01:25:50 retained upload `7922c03a-f9ae-4f20-aa9c-88c810e3fb23` and file `688d55ff-07ac-48ea-a5ce-9880e73372d0`, with a new persisted URL key and expiration 01:30:55. The first resumed transfer encountered a storage network error; an explicit subsequent retry succeeded.
- Android returned to detail showing three images. API-212 and API-208 returned HTTP 200 / VERIFIED; file size 9,735,587 bytes. API-217 returned HTTP 200 with three evidence entries and two supplements, including exactly one `QA_NETWORK_20261115_PAUSE_EXPIRED_URL` supplement. Bounded readback: `.cache/reporter-edge-20261114/pause-expiry-readback.json`.
- Android frozen supplement inspection confirmed the preserved description, lock explanation inside the content card and absence of add/remove photo controls.

## Limits / work continuing

- These checks establish the observed same-session interruption/expiry/retry path, not recovery after process death or every possible network failure.
- Known-part preservation is LOGIC_TESTED; this Android interruption occurred before an acknowledged first part and does not establish that separate native case.
- Cold restart currently requires login and leaves historical-session commands read-only. Safe refresh/session restoration needs a separate checkpoint. Pending data is preserved.
- This checkpoint does not certify the complete Crew/Operator audit or native cryptographic protection.
