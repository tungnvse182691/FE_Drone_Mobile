# Local draft inspection during failed cold-start refresh

- Reviewer: Codex; mode: IMPLEMENT_AND_SELF_REVIEW; baseline: `00f2df0`.
- Scope: auth continuity, isolated Crew/Reporter local read surface and tests.
- Not a completed offline editing, automatic sending, migration or encryption feature.

## Changes and boundaries

SecureStore continuity identifies the saved actor/environment/session for local reads only.
The reader rejects foreign accounts, environments, sessions and unrecognized row keys.
It returns counts, references and bounded description, not file URIs, command bodies,
keys, tokens, server authority or mutable drafts. Auth changes invalidate pending reads
and clear the view. No role route is mounted by this surface and no API is called.
Crew coverage is field drafts only; repair/receiving journals and overlay reconciliation
are not covered. Old sessions are preserved but not adopted.

## Executed checks

- `npx tsc --noEmit`: exit 0.
- Targeted local-draft view/read/auth/secure-session/operator tests: 21/21.
- `node --test --test-concurrency=2 tests/*.test.cjs`: 2095/2095, zero failures,
  duration 257485.6995ms; `.cache/offline-local-draft-full.log`.
- `git diff --check`: exit 0.
- Embedded QA x86_64 release build: BUILD SUCCESSFUL, 1m35s,
  `.cache/offline-local-draft-build.log`. Same explicit loopback-only QA overlay and
  invocation-only optimization disable as previous checkpoint; not a production APK.
- APK SHA256: `AF82FF5F65A38B6134734B2F0F96E214FC16714884749043A75E78DFA02A6AFA`.
- `adb -s emulator-5554 install -r`: Success; existing app data preserved.
- Android native app launched offline (WiFi/data disabled, API/MinIO reverse removed).
  Crew recovery showed `Xem bản nháp đã lưu`; opened isolated viewer with preserved-data
  empty state; Back returned to recovery. Network restored, Retry returned to the same
  Crew account/Home (46 incomplete, 4 complete), without credentials.
- Expo Go ANR dialog interfered with this run. Wait via UI/ADB did not dismiss it;
  only the hung Expo Go process was force-stopped. No app data was cleared.
  Emulator remained running throughout; WiFi/data and API/MinIO reverse restored.

## Evidence limits

LOGIC_TESTED: both roles with nonempty owned/foreign/corrupt fixture rows and late reads.
Android: Crew empty-state local view/back/reconnect only. Reporter native scenario,
nonempty native persistence, uploads, duplicate prevention and durable receipts NOT_RUN.
Runtime database/media remain plaintext. Hardware acceptance stays false.
No BE/Web/Docker/SQL mutation, push, reset, clean, stash or branch change.
