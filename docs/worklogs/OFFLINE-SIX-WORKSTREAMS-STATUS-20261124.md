# Six offline workstreams — evidence and remaining gates

Reviewer: Codex. Mode: IMPLEMENT_AND_SELF_REVIEW. Date: 2026-11-24.

FE checkpoint: `f86afa6` on main. BE read-only source:
`fb2761619cce11e05e439f322efbf41e00f8a7bf`.
This report does **not** accept the six workstreams as complete.

## Delivery status

| Workstream | Executed progress | Not delivered / not accepted |
|---|---|---|
| Crew signed offline | Enrollment/snapshot/immutable dispatch and reconciliation helpers exist; durable storage failures now throw; native signing primitives exercised | Real screen enrollment/snapshot/send flow, hardware-approved provider, isolated HTTP mutation and per-origin durable receipts |
| Handover 42A | Strict native codec; Java/BE protocol parity; Android QA roundtrip, tamper and wrong-key rejection | Real grant/export/import caller, independently authenticated recipient discovery, native production bridge acceptance and cross-client E2E |
| Local encryption | SQLCipher library included; encrypted QA database reopen and wrong-key tests; authenticated streaming QA file primitive | Runtime database remains plaintext; no DB/media/cache/queue migration; no runtime media caller of the file primitive |
| Legacy | Old ACK is not projected as durable receipt; unsupported replay is blocked; native app read-only inventory executed | Expo Go's actual pending inventory, supported recovery/readback and tested migration of nonempty pending data |
| Native | Separate Android app; repeated process instrumentation tests; native primitives and provider level measured | TEE/StrongBox acceptance: emulator reports SOFTWARE; production gate remains false. Android evidence does not establish iOS support |
| Three-role E2E | Logic regression and native primitives; embedded QA Crew cold start/reconnect executed, session restored after explicit retry | Crew cold-start local usability is incomplete (refresh overlay blocks local work). Actual pending Crew/Operator/Reporter offline → process death → reconnect → exactly-once effect/receipt scenarios remain NOT_RUN |

The four earlier local commits are `a0f6e08`, `d943806`, `dfa7667`, `f86afa6`.
Their worklogs record commands, APK hashes and evidence limits separately.

## Storage migration prerequisites found in current source

- `src/offline/database.ts` opens the owned `roadguard.db` connection without a key.
- `src/offline/kvStore.ts` shares this connection for Zustand/device state.
- Structured drafts/journals are stored in `local_draft`; legacy/current outboxes,
  media references, caches, partitions, wire commands and upload ledger also need
  migration inventory. Counting only an outbox does not inventory all pending work.
- SDK58 `expo-sqlite` `withExclusiveTransactionAsync` calls `Transaction.createAsync`
  and opens another connection. Setting a key on only the main handle cannot
  safely enable encryption. Existing callers include Crew journals/receiving/repair,
  Operator selection/task journals and upload queue.
- Crew files (`crewFieldDraft.ts`), Operator sources (`droneLocalFiles.ts`), Reporter
  photos (`reporterLocalMedia.ts`) and Operator preview cache (`operatorVideoCache.ts`)
  are separate lifecycle paths. Every reader/upload/checksum/thumbnail path must be
  audited before replacing files with encrypted bytes.
- Preserve source and pending references across interruption/key loss. Retaining
  plaintext originals is data preservation, not completed encryption coverage.
- `app/_layout.tsx` offers local task reads during failed session restoration only
  to Operator. Crew/Reporter cold-start access while refresh cannot reach the
  server is not implemented by merely persisting drafts. Do not turn a stored
  user object into an authenticated mutation identity to bypass this boundary.
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
recipient picker; whether that requires a new endpoint is a contract decision,
not proof of a Backend defect. Never trust a public key supplied by an imported
package merely because decryption succeeds.

SOFTWARE key custody, missing runtime encryption and unconnected FE actions are
not Backend bugs. No BE source, Docker, SQL or shared fixture was changed in this
checkpoint. `/health` on local API port18181 returned HTTP200 `Healthy` during
this review; this proves liveness only, not offline business API behavior.

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

1. Hardware-backed Android device/provider and build acceptance without policy bypass.
2. Keyed-connection design and interrupted candidate migration with nonempty fixtures.
3. Runtime encrypted file access/migration preserving pending references.
4. Explicit Crew workflow and trusted grant/recipient sources, then authorized HTTP checks.
5. Read-only inventory and supported reconciliation of actual preserved legacy data.
6. Dedicated role fixtures and real Android interruption/restart/reconnect/readback tests.

No completion assertion, production unlock, push, emulator restart, app-data reset
or automatic replay is authorized by this report.
