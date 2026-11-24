# Shared SQLite storage durability checkpoint

- Reviewer: Codex, IMPLEMENT_AND_SELF_REVIEW. Baseline a0f6e08.
- Scope: shared kv storage and legacy installation identity, no UI/API/schema change.
- Files: src/offline/kvStore.ts, src/store/storage.ts, src/constants/device.ts, tests/offline-storage-durability.test.cjs.

## Finding and fix

Separate SQLite owners and swallowed failures could report a volatile memory write as saved, or generate a replacement device ID after a read failure. Both callers now borrow the journal database owner. Native failures throw a neutral LOCAL_STORAGE_UNAVAILABLE; no SQL, keys or values are logged. Failed identity writes are not cached. Web storage remains separate. The installation ID does not grant native enrollment authority.

## Executed evidence

- Red: node --test tests/offline-storage-durability.test.cjs against previous callers: 1 pass / 2 fail (missing exceptions), .cache/offline-storage-durability-red.log.
- Green: same targeted command, 3/3 pass.
- npm run typecheck: exit 0, .cache/offline-storage-durability-typecheck.log.
- node --test --test-concurrency=2 tests/*.test.cjs: 2087/2087 pass, 0 fail, .cache/offline-storage-durability-full.log.
- git diff --check: exit 0.
- Android emulator-5554, Pixel 6 Pro, separate com.hoanghai.roadguard dev client: QA Crew login reached real Home and loaded tasks. Stopped only the app process and relaunched the same dev-client URL; Home/session restored without login. Emulator was not stopped/reset. Expo Go data unchanged. This verifies session persistence through an online app restart, not offline submission/receipt acceptance.
- Reviewed database imports: its domain imports are type-only; no storage/auth import cycle introduced. No navigation, icons, business state, financial UI, API authority or receipt changes.

## Limits

LOGIC_TESTED for injected persistence failures. Android online login/restart observed. Encryption migration, encrypted media, hardware custody and offline three-role E2E remain incomplete. No plaintext database was converted or removed in this checkpoint. Full hardware policy remains closed.
