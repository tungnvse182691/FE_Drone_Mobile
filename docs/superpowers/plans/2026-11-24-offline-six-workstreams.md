# Offline six workstreams implementation plan

**Goal:** Deliver native protected offline operations without changing existing business authority or losing pending data.

**Approval:** Owner approved six workstreams and local checkpoint commits, then specifically approved dev-client, SQLCipher/native module changes and side-by-side Android installation on 2026-11-24. No push authorized.

**Architecture:** Build `com.hoanghai.roadguard` separately from Expo Go. Keep signing/agreement private keys and derived shared secrets inside native. Preserve immutable journals and reconcile durable per-item receipts. Do not infer hardware custody from a successful build or JVM tests.

**Constraints:** Stay on main. No reset/clean/stash or emulator shutdown. No BE/Web/Docker/SQL edits. Preserve existing Expo Go data; a new app does not inherit its session/drafts. Do not relax TEE/StrongBox policy. iOS native evidence is separate. Full offline basemap and Reporter unsubmitted form restoration are outside these six workstreams.

## 1. Native foundation (workstream 5)

- [x] Inspect HEAD/WIP/origin, installed packages, running emulator and SDK58 dependency metadata.
- [x] Add `expo-dev-client ~58.0.20`; configure `expo-sqlite useSQLCipher`.
- [x] Generate Android project without clean; preserve existing Expo launch scripts.
- [x] Build SDK58 x86_64 APK with bounded Gradle workers; inspect manifest/signature/module autolinking.
- [x] Install beside Expo Go; launch without resetting either application's data.
- [x] Probe module and SQLCipher on Android; measure native key capabilities without claiming hardware proof from missing keys. Five fresh-process probes pass; SOFTWARE custody does not satisfy production hardware policy.
- [x] Typecheck, targeted/full regression, diff/secret review and verified installation; foundation committed as `a0f6e08`, without full native crypto acceptance.

Files: `app.json`, `package.json`, `package-lock.json`, checkpoint worklog. Android output remains generated/ignored.

## 2. Protected local storage (workstream 3)

Progress: durable storage errors now fail closed (`d943806`). Local file primitive verified in two Android processes; it is not yet wired into media callers. DB/file migration and exclusive-connection keying remain incomplete. See `OFFLINE-LOCAL-FILE-CRYPTO-20261124-review.md`.

- [ ] Map DB, exclusive transaction connections, files/thumbnails/cache and pending media callers across all roles.
- [ ] Add interrupted-migration tests before implementation; nonempty pending fixtures and account/environment isolation.
- [ ] Implement key custody and candidate migration with independent integrity/content/reference validation and durable restart marker.
- [ ] Initialize keys on every SQLite connection, including exclusive transaction connections, before any schema read.
- [ ] Add native file encryption and authenticated streaming access without exporting private/shared secrets.
- [ ] Verify interrupted writes, process death and key loss; preserve original on failure and report any plaintext retention as incomplete coverage.
- [ ] Commit verified scope. Do not migrate Expo Go data implicitly.

## 3. Crew signed workflow (workstream 1)

- [ ] Read current enrollment/snapshot/batch DTOs, guards and current fixture authority.
- [ ] Test and connect existing helpers to explicit actions in existing sync flow.
- [ ] Preserve immutable actor/environment/device/resource/version/body/key and current session checks through every await.
- [ ] Native signatures must interoperate with independent BE canonical vectors; do not toggle acceptance constant to bypass missing evidence.
- [ ] HTTP verify isolated fixture, uncertain outcome and per-origin readback; commit after gates.

## 4. Encrypted handover 42A (workstream 2)

- [ ] Port exact canonical header/package/recipient context and validation from pinned BE source.
- [ ] Add independent .NET interoperability and tamper/wrong-recipient/key-loss tests before adding bridge seal/open.
- [ ] Implement native P256 ECDH -> HKDF-SHA256 -> AES256-GCM, nonce12/tag16 and P1363 signature64; private/shared keys stay native.
- [ ] Connect current grants/export/import/artifacts preserving original actor and requiring independently trusted device keys.
- [ ] Verify authorized recipient/grant/revocation fixture; no Web implementation in this task. Commit verified scope.

## 5. Legacy disposition (workstream 4)

- [ ] Inventory preserved entries read-only; distinguish current upload pipelines from old blocked outbox.
- [ ] Test safe reconciliation/inspection, immutable legacy payload preservation and absence of automatic adoption.
- [ ] Implement only supported recovery; retain BLOCKED_CONTRACT or UNKNOWN_OUTCOME without durable source proof.
- [ ] Android verify safe paths and commit.

## 6. Combined role acceptance (workstream 6)

- [ ] Crew: offline capture/commands, app process restart, reconnect, no duplicate effects and per-item server receipts.
- [ ] Operator: own upload pipeline, offline interruption/restart/resume and session/environment separation; no Crew signed authority.
- [ ] Reporter: own started submission pipeline, interruption/restart/resume and receipt checks; no Crew enrollment.
- [ ] Handover: current grant, original actor, tamper rejection, key loss and current rights on reconnect.
- [ ] Record native/HTTP/Android evidence independently. Missing hardware/fixture/build remains NOT_RUN or its precise blocking label.
- [ ] Commit final evidence only for executed results. No push.
