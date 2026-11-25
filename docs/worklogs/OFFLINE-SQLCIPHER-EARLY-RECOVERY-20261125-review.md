# SQLCipher early interruption recovery — 2026-11-25

Reviewer: Codex, IMPLEMENT_AND_SELF_REVIEW. Parent SHA 5bf0c9d, main.
Scope: encryptedDatabase, its behavioral tests, isolated native storage probe
and probe documentation. No account UI, API, business authority or BE edits.

## Root cause and correction

SecureStore COPYING is durable before ATTACH creates the encrypted candidate.
A termination in that interval left a valid source and key but the old code
rejected every restart because the candidate did not exist. Resume now exports
only when that candidate is absent, using the existing key. Existing candidates
remain verify-only, never overwritten. Activation still requires exact schema,
row multiset, headers and integrity checks.

A COPYING state also now requires the retained original to exist before opening
it. SQLite must not silently create an empty replacement and promote that as
recovered data. ACTIVE with missing/wrong key or file still fails closed; no
fallback, key regeneration, deletion or automatic pending replay was added.

## Executed logic evidence

- Two RED tests reproduced early interruption and missing-source opening.
- After correction: node --test tests/encrypted-database.test.cjs, 10/10.
- Full regression: node --test tests/*.test.cjs, 2132/2132.
- npx tsc --noEmit, exit 0 after native probe change.
- Evidence: .cache/offline-session-20261124/storage-resume-*.
- Android14 x86_64 native early-interruption recovery passed at 12:49:10,
  then a second fresh app process passed at 12:49:49 (UTC+7).
- Probe build: BUILD SUCCESSFUL, 9m32s, exit0. APK SHA256
  7B537B755EDAB840826241E353FD0C8F386EC431298DF53754F5B845666B60FF.
- Evidence: storage-resume-native.log, storage-resume-native-first.png,
  storage-resume-native-second.png and storage-resume-vietnamese-details.png
  under the evidence directory above. metadata-save/wrong-key errors were
  intentionally injected and caught, not uncaught runtime failures.

The isolated native fixture rg.qa.pre-attach.20261125. injects failure after
COPYING persistence, asserts no candidate exists, then verifies same-key export,
three preserved rows and pending blob bytes. It does not reset an account DB.

## Normal application restoration

- Normal Expo Router APK rebuilt without the storageQa entry point; build exit0,
  2m26s. SHA256 D858930DBFF51C1130B279CFD3829FAFE063CD4CD5956785373A5EC917113659.
- Installed with adb install -r; the existing Crew session restored without
  login or app-data reset. Android emulator remained running throughout.
- Searched task 064aa120-8d11-4765-897f-44f30cd089bf in Tasks, opened task detail,
  then its submitted field dossier: revision1, one photo, depth1cm and original
  synthetic instrument/method present. The screen is read-only. LOCATION_UNKNOWN
  remains visible; no PM acceptance or completed repair is inferred.
- Evidence: storage-resume-normal-build.log, storage-resume-normal-dossier.png.
  adb logcat -d --pid=26381 -b crash -v brief returned no crash entry.
- Fresh node --test tests/encrypted-database.test.cjs: 10/10, exit0.

## Review boundaries

No icon, route, cost, branding, defect enum, wire or receipt changes. Expected
errors expose sanitized stages only. Existing ciphertext that does not match
the source remains blocked for separate recovery; it is not overwritten.
Retained plaintext originals are not described as fully encrypted storage.

English in owner screenshot Screenshot_1795578316.png was diagnostic FE text in
tests/native-probe/storage-entry.tsx, not a BE response. Current disclosure
renders Vietnamese; diagnostic logs retain technical identifiers.

Fresh origin/main remains 71aeb0a; BE remote develop b891e88 matches healthy
Docker image roadguard-crew-sandbox-api:develop-b891e88. Read-only Crew device
HTTP GET returned 200; this does not establish peer-key discovery. Current BE
source explicitly denies cross-actor device reads for Crew; no peer device was
available in the dedicated fixture for an additional HTTP denial proof.

Signed production acceptance remains false: emulator SOFTWARE keys are not
TEE/StrongBox proof. 42A still needs authenticated peer-key/registration and
grant/package delivery. These are not fixed by changing a capability flag.
