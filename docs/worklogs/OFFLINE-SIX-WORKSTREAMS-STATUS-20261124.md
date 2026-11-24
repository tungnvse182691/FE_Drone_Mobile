# Six offline workstreams — evidence and remaining gates

Reviewer: Codex. Mode: IMPLEMENT_AND_SELF_REVIEW. Updated: 2026-11-25.

FE implementation checkpoint: `e1e9652` on main. BE local read-only source:
`fb2761619cce11e05e439f322efbf41e00f8a7bf`; deployed API: `b891e88`.
Remote develop checked again on 2026-11-24: `b891e88ea20073bab7b110f301b7b37ebfa1c40c`.
The two remote-only commits change Supervisor road-coverage document discovery,
Survey tests and handoff documentation; no offline controller/DTO/repository delta.
The authorized existing sandbox API update has since deployed `b891e88` without
replacing SQL/MinIO/Mailpit or their volumes. No BE source was edited.
This report does **not** accept the six workstreams as complete.

## Delivery status

| Workstream | Executed progress | Not delivered / not accepted |
|---|---|---|
| Crew signed offline | Enrollment/snapshot/immutable dispatch and reconciliation helpers; dedicated HTTP fixture enrollment/snapshot/signed accept, durable origin readback and exact replay with one ACCEPTED event | Real screen enrollment/snapshot/send flow and hardware-approved provider; HTTP software fixture is not native signing acceptance |
| Handover 42A | Strict native codec; Java/BE protocol parity; Android QA roundtrip, tamper and wrong-key rejection | Real grant/export/import caller, independently authenticated recipient discovery, native production bridge acceptance and cross-client E2E |
| Local encryption | Runtime SQLCipher candidate activated; complete schema/row verification; keyed exclusive transactions; actual JS adapter two-process and interruption tests | Original plaintext DB retained for preservation; runtime media still plaintext; full at-rest coverage is not accepted |
| Legacy | Old ACK is not projected as durable receipt; unsupported replay blocked; owned Crew field/repair/receiving and Reporter draft metadata available during failed restore; nonempty Crew draft preserved across real app restart | Expo Go's actual pending inventory, remaining command families, supported reconciliation of historical pending data |
| Native | Separate Android app; repeated process instrumentation tests; native primitives and provider level measured | TEE/StrongBox acceptance: emulator reports SOFTWARE; production gate remains false. Android evidence does not establish iOS support |
| Three-role E2E | Actual Crew dedicated task started in app; API unavailable → save 7.58 cm draft → app-only cold restart → read-only inventory → API restore/retry → same session and 7.58 cm draft retained | Crew photo/upload/submit and Operator/Reporter interruption/reconnect/exactly-once scenarios remain NOT_RUN; API-unavailable test did not disable all radios |

The six implementation/test commits are `a0f6e08`, `d943806`, `dfa7667`, `f86afa6`,
`00f2df0`, `275bf52`.
Their worklogs record commands, APK hashes and evidence limits separately.

## Storage migration prerequisites found in current source

- `src/offline/database.ts` now opens the verified encrypted candidate through
  `encryptedDatabase.ts`; the original `roadguard.db` remains preserved.
- `src/offline/kvStore.ts` shares this connection for Zustand/device state.
- Structured drafts/journals are stored in `local_draft`; legacy/current outboxes,
  media references, caches, partitions, wire commands and upload ledger also need
  migration inventory. Counting only an outbox does not inventory all pending work.
- SDK58 `expo-sqlite` `withExclusiveTransactionAsync` calls `Transaction.createAsync`
  and opens another connection. Setting a key on only the main handle cannot
  safely enable encryption. The new adapter keys the transaction connection too.
  Existing callers include Crew journals/receiving/repair, Operator journals and upload queue.
- Crew files (`crewFieldDraft.ts`), Operator sources (`droneLocalFiles.ts`), Reporter
  photos (`reporterLocalMedia.ts`) and Operator preview cache (`operatorVideoCache.ts`)
  are separate lifecycle paths. Every reader/upload/checksum/thumbnail path must be
  audited before replacing files with encrypted bytes.
- Preserve source and pending references across interruption/key loss. Retaining
  plaintext originals is data preservation, not completed encryption coverage.
- `app/_layout.tsx` now offers Operator local tasks and an isolated Crew/Reporter
  local draft metadata reader during failed refresh. It does not grant editing,
  role-route access or network mutation authority. Do not turn a stored user
  object into an authenticated mutation identity to bypass this boundary.
- `useCrewInbox` uses TanStack Query's runtime cache; that cache alone is not a
  durable task snapshot across a killed process. Existing SQLite draft persistence
  does not prove the task list can be reconstructed offline.

Read-only native inventory: app not running; no WAL/journal sidecar; in-memory
SQLite deserialize with `query_only`; counts only; source SHA256 unchanged before
and after. Result: plaintext 12,288 bytes, `kv_store` two rows. No payload/key/token
was printed. This describes the separate native app only, **not Expo Go**.
Evidence: `.cache/offline-native-inventory.py`, `.cache/offline-native-inventory.log`.

## Backend boundary

Current `OfflineWorkflowController.cs` provides device registration/get/revocation,
snapshot create/get, sync, package export/prepare/get, grant issue/get/revoke,
import, batch/origin reads, start reconciliation and artifact register/get.
Do not report these APIs as absent.

Authenticated device/grant GET requires known registration/grant IDs. This
controller has no collection discovery route. A trusted discovery/distribution
channel for recipient keys and grant IDs must be established before wiring a
recipient picker. There is a further current authorization boundary: repository
`OfflineWorkflowRepository.cs:88` rejects Crew device-get for another actor.
Package/grant GET contains registration IDs but does not independently return the
source and recipient registered public-key pair. Cross-actor source validation
and recipient-key selection therefore need an approved authenticated source;
whether that requires a new endpoint is a contract decision, not proof of a
Backend defect. Never trust a public key supplied by an imported package merely
because decryption succeeds. See `OFFLINE-42A-AUTHENTICATED-KEY-SOURCE-20261124.md`.

SOFTWARE key custody, remaining media encryption and unconnected FE actions are
not Backend bugs. Dedicated fixture HTTP evidence is now available; it must not
be described as Android signed-send acceptance. See the 20261125 Crew checkpoint.

## QA standalone build checkpoint

An embedded-JavaScript APK is needed to distinguish offline app behavior from
development-client dependence on Metro. Initial release CMake failed on Windows
Ninja path length; scoped short staging was added for Reanimated/Worklets. The
next attempt reached R8 and failed with `Metaspace` at the configured 512MiB cap.
QA invocation disables optimization by command-line flags only. PowerShell dotted
`-P` arguments must be quoted; an unquoted attempt failed during plugin setup.

Build/Android cold-start results are recorded in the separate checkpoint worklog.
They cannot be substituted for pending-upload or signed-workflow E2E acceptance.
See `OFFLINE-EMBEDDED-ANDROID-COLDSTART-20261124-review.md`: standalone QA build
and install succeeded; a test-only loopback HTTP overlay was required for Docker.
Default release security configuration is unchanged. On actual offline process
restart Crew showed the session-recovery screen; after restoring network and
tapping retry the same Crew account/Home returned. No pending business mutation
or three-role exactly-once scenario was tested.

## Remaining evidence required

2026-11-25 recovery inventory update: signed C10BC journal summaries are now
included with strict ownership and shared decoder validation (LOGIC_TESTED).
2106/2106 regression tests and typecheck passed. New embedded APK preserved the
Crew field draft through radio-off app restart on Android. This does not prove
signed dispatch or three-role exactly-once behavior. See
`OFFLINE-JOURNAL-RECOVERY-20261125-review.md` for exact evidence and limits.

1. Hardware-backed Android device/provider and build acceptance without policy bypass.
2. Remaining storage crash points and preservation of original plaintext DB.
3. Runtime encrypted file access/migration preserving pending references.
4. Explicit Crew workflow and trusted grant/recipient sources, then authorized HTTP checks.
5. Read-only inventory and supported reconciliation of actual preserved legacy data.
6. Dedicated role fixtures and real Android interruption/restart/reconnect/readback tests.

No completion assertion, production unlock, push, emulator restart, app-data reset
or automatic replay is authorized by this report.
