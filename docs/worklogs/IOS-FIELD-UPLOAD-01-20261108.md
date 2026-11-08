# IOS-FIELD-UPLOAD-01 — audit and sandbox configuration proposal

Date: 2026-11-08. Mode: IMPLEMENT_AND_SELF_REVIEW. PUSH=NO.
FE baseline: 50fbb04986895ccb8a8a9651fad798479bc3d7c2.
BE reference (read-only): de14374033506a07cf791fa6918d706c1a39408c.

## Findings and limits

1. Confirmed configuration blocker: sandbox `/handoff/config.json` has
   `MinioStorage.Endpoint=http://minio:9000` and
   `MinioStorage.PublicEndpoint=http://localhost:19101`.
   Docker publishes MinIO on `127.0.0.1:19101`, not a LAN interface.
   A physical iPhone's localhost is its own loopback. The existing API LAN proxy
   does not make that storage endpoint reachable.
2. BE `MinioUploadObjectStorage.cs:35-36,136-151` uses PublicEndpoint for
   presigning, with PUT and the original part number/upload ID. FE
   `crewApi.ts:1083` sends that URL unchanged through a separate Axios client,
   with Content-Type and without the API bearer interceptor.
3. Metro network evidence captured during this audit: API `/uploads` POST 201,
   session GET 200, `/part-urls` POST 200, and a later `/part-urls` POST 409.
   No storage PUT or complete request was observed in that capture. Bodies were
   unavailable. Do not equate this with proof of a specific iPhone PUT error.
   CDP reported a reconnect gap. The exact original native exception, session
   expiry, and meaning of the observed 409 remain unverified.
4. `crewFieldDraft.ts` previously discarded the PUT stage when presenting a
   transport exception, falling back to the generic operation message. It also
   threw on server FAILED without saving that state for the evidence chip.
5. No device SQLite, private photos or pending payload was extracted. Owner's
   two local photos are context, not independently verified device evidence.

## FE changes

- Annotate a mutable PUT exception with a safe stage only, keeping the same
  exception/status/code. No URL, body or credential is added to diagnostics.
- Explain storage network/timeout failures and storage 403 separately from
  API task authorization, 409/412, and unknown operation outcomes. A storage
  403 is not asserted to be SignatureDoesNotMatch without its response code.
- Persist identity-checked server FAILED sessions, retain the local photo and
  upload identity, and show a failed evidence chip. VERIFIED still requires
  session/file metadata and checksum/size/media-type checks.
- No automatic POST, new upload, retry, submit or journal replay was added.
- Behavioural mocks cover PUT failure, saved-state reopen and explicit retry
  with the original upload/key, plus authoritative FAILED without submit.
  This test reopen is a cloned persisted draft, not a native cold restart.

## Concrete LAN sandbox proposal — NOT APPLIED

Owner requested a final configuration for review before runtime changes.

Use one client-visible storage authority for all sandbox devices. Current
candidate LAN address is `192.168.1.98` (observed Metro/API traffic); reconfirm
the active adapter and device routes immediately before applying.

```dotenv
# Proposed sandbox-only settings, not added to .env.local or runtime yet
SANDBOX_LAN_IP=192.168.1.98
SANDBOX_API_PORT=18181
SANDBOX_STORAGE_PORT=19101
```

| Component | Proposed configuration |
|---|---|
| Existing API LAN proxy | Keep LAN-IP:18181 to 127.0.0.1:18181, sandbox only |
| New storage LAN proxy | Bind exactly LAN-IP:19101; upstream 127.0.0.1:19101 |
| BE internal MinIO Endpoint | Keep http://minio:9000 |
| BE runtime PublicEndpoint | http://LAN-IP:19101 |
| FE sandbox | Existing EXPO_PUBLIC_API_HOST=LAN-IP, EXPO_PUBLIC_API_PORT=18181 |
| Windows firewall | Private profile, selected LAN interface/local subnet only; never public profile or Internet forwarding |

The storage proxy must stream bytes unchanged, preserve the incoming Host
(including port), original raw path/query and Content-Type, return ETag/status
unchanged, avoid redirects/decompression/body reserialization, and suppress
URL/query/body/access logging. Bind the specific LAN interface, not 0.0.0.0.
Only client storage PUT/GET/HEAD are needed; MinIO console/admin ports are not
published by this proposal. No router port forwarding, tunnel or public DNS.
Binding the same port on LAN and loopback needs a socket availability check
before starting; if Docker/Windows reserves it globally, stop and revise the
proposal instead of changing mappings silently.

Application after final approval: record safe config values, preserve the
sandbox state volume, change only PublicEndpoint in the sandbox runtime config
held in `roadguard-crew-sandbox_state` at `/handoff/config.json`, and apply the
setting to the sandbox API process only. Confirm the process reads that file
and restart requirements before execution. This may briefly interrupt sandbox
API requests; do not reload/logout Expo Go. No BE source, demo container,
database/volume reset, or journal edits are required or authorized here.

### Device routing

| Environment | API / signed storage strategy | Evidence |
|---|---|---|
| iPhone Expo Go | Shared LAN-IP:18181 / LAN-IP:19101 | API traffic observed; storage/E2E NOT_RUN |
| Android Emulator | Same LAN endpoints through host routing; 10.0.2.2 remains an alternative for API only | No device connected; NOT_RUN |
| OPPO | Same LAN endpoints on the same trusted Wi-Fi | No device connected; NOT_RUN |
| OPPO USB without LAN route | Existing ADB reverse mode can serve loopback endpoints; it does not make a LAN-authority signed URL reachable by itself | Additional route needed; NOT_VERIFIED |
| Future APK | Reachable HTTPS API/storage DNS, valid certs; no Metro/ADB dependency | Design review only; APK_RELEASE_VERIFIED is not claimed |
| Production | Environment-selected HTTPS API origin and HTTPS storage signing authority | Current client resolver constructs HTTP; release config support remains a gap |

For Wi-Fi/IP changes, update SANDBOX_LAN_IP once in a future sandbox launcher
that validates a private active adapter and renders the proxy/PublicEndpoint/FE
launch settings together. Do not silently switch the running app environment:
API origin partitions session/journal/cache. Prefer a DHCP reservation on the
trusted router for a stable IP. A stable hostname is an alternative only after
DNS resolution is proven on all three clients; do not assume .local works on
Android Emulator. None of this launcher/runtime work is applied by this commit.

## In-flight upload reconciliation before any mutation

1. Read the original draft/journal for the same actor, API environment, task and
   session. Preserve photos, checksum, upload/file IDs, create/complete keys,
   original complete body/If-Match, saved parts/ETags and part issuance keys.
2. Explicit read-only GET of the known upload session; validate identity and
   permissions. VERIFIED requires file metadata verification. VERIFYING means
   read/poll only. FAILED or expired session is a blocker, not permission to
   delete or manufacture a replacement.
3. BE `UploadPersistenceService.cs:200-202,270-291` rejects terminal/expired
   sessions and expired issuance receipts with 409. For a valid receipt, replay
   re-signs the same object/upload/parts using its original expiry and current
   PublicEndpoint. Existing already-issued URLs keep their old host/signature;
   never rewrite them in FE/proxy.
4. After approved endpoint configuration, a valid issuance can be explicitly
   retried with its saved identity. Expired capability renewal must follow the
   existing definitive-409 flow, not change create/complete identity. Do not
   infer from 409 alone that a pending complete/submit was never committed.
5. If a pending complete/submit exists, reconcile its exact original command
   and readback before new work. No automatic replay during mount/refresh.
   Actual iPhone journal/session recovery remains NOT_RUN in this task.

## Native / release audit

`modules/roadguard-offline-crypto/index.ts:16-22` uses an optional native module,
fails closed when absent, and has NATIVE_ACCEPTANCE_VERIFIED=false. Expo Go
cannot certify this custom native provider, signing/key lifecycle or offline
signed sync. FIELD online upload SHA-256 does not grant offline signing rights.
Native development/release builds and custody/interop/restart tests remain
required. Camera/location permission plugins were not changed. APK review must
also resolve production HTTPS selection and platform transport policies;
bundles are not proof of native permissions, TLS or release behaviour.

## Verification

- TypeScript: `npx tsc --noEmit`, exit 0 on final source.
- Expo Doctor: `npx expo-doctor`, 20/20 checks passed.
- Targeted: `node --test tests/t05b.test.cjs tests/crew-field-ux-01.test.cjs`, 42/42 passed.
- Full regression: `node --test --test-concurrency=2 tests/*.test.cjs`, final run 1307/1307 passed, zero failed/skipped, exit 0. Raw local evidence: `.cache/ios-field-upload-01-final-regression.log` (not staged).
- `git diff --check`: passed before staging. Post-commit `git show --check HEAD` is reported in handoff.
- iOS + Android bundle export: both succeeded via `npx expo export --platform ios --platform android --output-dir .cache/ios-field-upload-01-final-export`.
- ADB: no attached devices; mobile device inventory empty. Android/OPPO smoke NOT_RUN.
- iPhone: Metro target observed; storage bytes/complete/VERIFIED/submit E2E NOT_RUN.
- Sandbox GET /ready: database/privateStorage/testMail true. This is not upload verification.
- Source invariant scan: no Ionicons/cost UI matches; one existing mock-file comment only.
- No BE source/runtime, proxy, DB or Docker mutation applied by the agent.
- Untracked artifacts retained; no push.

## Owner acceptance steps after final runtime approval

First inspect the saved upload/journal read-only and correlate the observed
409. Then, with Owner present and the exact pending intent understood, test one
explicit upload action on an eligible sandbox task. Observe part PUT status and
ETag without recording full signed URLs; observe complete, session VERIFIED and
matching file metadata before considering submit. Do not press FIELD submit as
part of connectivity checks. Repeat on Emulator and OPPO when connected.

Status: FE diagnostic/state correction LOGIC_TESTED; end-to-end upload remains
blocked by final LAN runtime approval and missing native evidence. UI acceptance
and cross-platform upload success are not claimed.
