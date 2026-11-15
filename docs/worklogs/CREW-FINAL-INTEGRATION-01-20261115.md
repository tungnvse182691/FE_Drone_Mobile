# CREW-FINAL-INTEGRATION-01 — 2026-11-15

Mode: Codex IMPLEMENT_AND_SELF_REVIEW. This is a scoped self-review, not an independent review. Crew integration plus the owner's explicit registration/iPhone UI fixes. No Operator changes. Overall acceptance: **PARTIAL / BLOCKED**, not full Crew or iPhone PASS.

## 1. Source, environment and HEAD

- FE initial HEAD: `b7ff574f670c18b0187c4bec2f886a982c780de2`, branch `main`.
- Source checkpoint HEAD: `4cd57bca47d1f71161563dd89a8f561298a254a8`; this report is a separate local documentation commit whose SHA is available in Git history.
- Fetched `origin/main`: `fb0e379f577f96826cef79d9097ceeca3c33395f`. Initial ahead/behind: 15/0; after three source commits: 18/0; after this report commit, expected 19/0 (confirm with final Git command).
- BE checkout HEAD: `5d20a09a72643b1f7ab87bebeee7d309e593f689`; fetched/pinned `origin/develop`: `3d61a39232a05a1835c6f1ac8c52c70c54201a7e`. Runtime baseline: `3d61a39`. Checkout HEAD and runtime SHA are deliberately distinguished.
- Sandbox HTTP: loopback API 18181, MinIO 19101. Android: emulator-5554, Android 14, Expo Go, Metro 8081. Existing iPhone Metro/proxy configuration retained.
- Read AGENTS.md, roadguard/code-review skills, governance, Crew contracts, current DTO/guards and the six worklogs requested by the owner. BE Candidate3/source/config remained read-only.

## 2. Atomic local checkpoints

| Checkpoint | Commit | Files |
| --- | --- | --- |
| Registration password visibility | `c2e1f0f297563163fe7be8d5569e85e57863d792` | `app/(auth)/register.tsx`, `tests/register-password-visibility.test.cjs` |
| FIELD measurement editor and keyboard accommodation | `f49011f0f99ce6823cf478744e104f288e7f0e9b` | `app/(crew)/field-review.tsx`, `src/components/SafeAreaScreen.tsx`, `tests/crew-field-feedback-state.test.cjs`, `tests/crew-field-instrument-edit.test.cjs` |
| Current Crew task modes and filters | `4cd57bca47d1f71161563dd89a8f561298a254a8` | `src/api/crewApi.ts`, `app/(crew)/tasks.tsx`, `tests/crew-current-mode.test.cjs`, `tests/dot-c-crew-filter.test.cjs`, `tests/t04.test.cjs` |

Only explicit checkpoint paths were staged. No dependency, provider, app configuration or backend source changes.

## 3. Password and measurement UI fixes

- Registration password stays hidden initially. A 48×48 MaterialIcons eye control toggles visibility, with Vietnamese accessibility labels. Password value, validation and registration payload are unchanged.
- FIELD shows compact measurement rows with label, current value and unit. Users expand one editor, enter its instrument/method/value and use “Xong số đo này” to dismiss the keyboard and collapse the editor.
- Measurement/position modals opt into ScrollView keyboard insets. Handled taps and keyboard dismissal make lower actions reachable; shared SafeAreaScreen consumers do not automatically opt into keyboard insets.
- Android: entered local depth 4.6 cm, dismissed keyboard, collapsed editor, saved draft, force-stopped/reopened Expo Go and read the same 4.6 cm draft. Server revision remains 4.2 cm; local save is not a new submission.
- Evidence: `.cache/crew-final-measurement-saved.png`, `.cache/crew-final-native-restart.py`; native hierarchy/screenshot inspections were executed on the emulator.
- Registration show/hide and FIELD controls were exercised on Android. **Actual iPhone visual/keyboard acceptance is NOT_RUN**; platform-specific changes are not claimed as iPhone PASS.
- Research used: [React Native ScrollView](https://reactnative.dev/docs/scrollview), [Material text field password controls](https://github.com/material-components/material-components-android/blob/master/docs/components/TextField.md). These support keyboard insets/handled taps and password visibility controls; they do not prove this app's iPhone behavior.

## 4. Mode mapping and filter matrix

`crewTaskFromWire()` preserves current `MEASURE_ONLY`, `NORMAL`, `CONDITIONAL_FT` and recognized legacy values, retains raw mode, and uses UNKNOWN only for unrecognized values. Filters and labels cover current planned/conditional repair modes. No execution permission is inferred from a task mode.

| Scenario | Logic | Android / HTTP |
| --- | --- | --- |
| MEASURE_ONLY | PASS | List API supplies this value |
| NORMAL | PASS | Detail GET 200; list projection mismatch below |
| CONDITIONAL_FT | PASS | New private QA detail shows “Sửa chữa nhanh có điều kiện” on Android |
| Valid legacy / truly unknown | PASS | Dedicated native fixture NOT_RUN |
| All / individual filters / completed-state combinations | PASS | Current-mode native list acceptance BLOCKED by BE projection |
| Reassignment / permission revoked | Existing guards retained and regression suite passes | Fresh native revocation NOT_RUN |

Concrete **BE projection defect**: `InspectionTaskQueryService.cs` around line 80 at pinned develop constructs every list row using literal `"MEASURE_ONLY"`. GET `/api/v1/me/inspection-tasks?limit=100` returned 200, nextCursor null. For tasks `ebcdca88…`, `ce4ba53e…`, `65095828…`, `91f8a58c…`, list mode is MEASURE_ONLY while API-080 detail GET 200 returns NORMAL. Evidence: `.cache/crew-final-mode-evidence.json` and `.cache/crew-final-mode-evidence.py`.

Expected: list mode reflects the actual task/repair binding. Actual: repair tasks are presented as measurement-only. Impact: filters cannot reliably find NORMAL/FastTrack from list responses. **P1 BE_CONTRACT_GAP / implementation projection defect**, not a request for a new API. FE does not invent mode or add per-row detail calls to mask it.

## 5. FastTrack fixture preparation and HTTP evidence

Prepared a new isolated QA fixture through official PM APIs; no SQL/seed script execution. Durable intent journal: `.cache/crew-final-fasttrack-20261115-journal.json`. No historical completed fixture was reopened or modified for FastTrack.

Sandbox identifiers:

- project `72f84201-c001-4000-8000-000000000001`
- package `554beb4b-6567-4179-9f8a-3a439872b437`
- item `099559ed-0254-4026-ab13-1cd5139c64f6`
- task `9b840ab7-030e-40b0-8f08-05ebf0427bd0`
- binding `2193cfbe-1325-4103-80ed-62e47aa319ef`
- policy revision `ef8d6335-8517-48c9-ac0e-60d307b338e4`

| Actor / operation | Actual HTTP | Result |
| --- | --- | --- |
| PM POST `/projects/{p}/repair-packages` | 201 | New QA package |
| PM POST `/projects/{p}/repair-policies/drafts` | 201 | QA policy draft |
| PM POST `/projects/{p}/repair-policies/drafts/{id}/publish` | 201 | Published QA revision |
| PM POST `/projects/{p}/repair-packages/{package}/items` | 201 | FAST_TRACK item |
| PM POST `/projects/{p}/repair-packages/{package}/items/{item}/assign` | 201 | CONDITIONAL_FT task and real binding |
| Crew GET API-080 detail | 200 | FAST_TRACK context, real itemVersion, initially NewAssigned; fresh read after native acceptance is Accepted |
| Crew GET API-146 eligibility | 200 | eligible=false / INELIGIBLE, configured policy, mapping absent |

Paths above are relative to `/api/v1`. Policy limits are synthetic private QA policy data created through PM API; they are not app constants or approved production thresholds. Existing defect code is read faithfully from BE, not invented by FE.

One QA helper failed locally on a null header before HTTP dispatch. Journal records NOT_DISPATCHED. The subsequent dispatch retained the original body/key and omitted the null header; response 201. This is not a server timeout or a duplicate request.

## 6. FastTrack Android acceptance matrix

| Scenario | Status | Evidence / limitation |
| --- | --- | --- |
| Open conditional task / correct label / repair context | PASS | Actual Android detail on new QA task |
| Accept assigned task | PASS | Android “Nhận nhiệm vụ”; API-080 readback 200 Accepted |
| Open execution stages | PASS | Native “Theo dõi thi công”, pending stages; no inferred start |
| Eligibility missing preconditions | PASS for HTTP denial; full native eligibility presentation not claimed | API-146 200 eligible=false |
| Assessment → start → finish → intake → final decision | BLOCKED | Source mappings/authority below; no bypass or fabricated pass |
| Lost Crew permission / changed ETag / timeout | NOT_RUN on new Android fixture | Source/regression coverage is not Android fault injection |
| Restart after final FastTrack decision | BLOCKED | No final FastTrack decision produced |

Exact API-146 reasons: `ASSESSMENT_REQUIRED`, `COVERAGE_MAPPING_UNKNOWN`, `CURRENT_EXECUTION_AUTHORITY_DENIED`, `FIRST_START_NOT_VERIFIED`, `ROAD_HANDOVER_MAPPING_UNKNOWN`. `sourceMapping=UNKNOWN_OWNER_MAPPING`, `coverageMapping=null`, warrantySources/handoverSources empty. Evidence: `.cache/crew-final-ft-readback.json`.

Assessment/start are unperformed workflow prerequisites; they are not separately alleged missing APIs. The independent source-mapping prerequisites remain unresolved: **BE_FIXTURE_BLOCKED / BE_DISCOVERY_GAP** for an authorized QA coverage/handover source and its preparation path. Request BE fixture guidance or data through supported APIs before claiming full FastTrack E2E.

The attached task mentions Supervisor final for FastTrack. Current canonical BR-25 and `RepairWorkflowRepository.Producing.cs` around lines 764–770 require **PM final for FAST_TRACK**, Supervisor for NORMAL. Follow current guard; do not add a Supervisor FastTrack gate. PM ACCEPT, final CONFIRMED, task Completed and context Confirmed remain separate states.

## 7. Safety, FIELD and review: reused evidence vs fresh checks

The requested previous worklogs were read. Their native mutations are **REUSED_VERIFIED_EVIDENCE**, not represented as newly run in this checkpoint.

| Flow | Reused native / HTTP evidence | Fresh check this checkpoint |
| --- | --- | --- |
| NORMAL closeout | `CREW-NORMAL-CLOSEOUT-ANDROID-20261115.md`: assessment/start/finish, BEFORE/AFTER VERIFIED, intake, PM ACCEPT 201, Supervisor final 201 | API-080 200 still Completed / Confirmed with final CONFIRMED |
| Safety | `CREW-SAFETY-REVIEW-ANDROID-20261115.md`: native check, API-152 200 matching check `15f29522…`, eligible link `36cbf9e2…` | Task detail API-080 200; no new install/check mutation |
| Review request | Same worklog: native API-150 request `6baf4c35…` linked to decision `fa6dd877…`, API-080 matching readback | Task API-080 200; no duplicate review request |
| Three dimensions | `CREW-FIELD-READBACK-20261115.md`: 3.5 cm, 1.2 m, 0.8 m and two photos | API-096 200 READY, same three dimensions/two evidence |
| FIELD supplement | `CREW-FIELD-SUPPLEMENT-20261115.md`: revision 2, retained evidence and lineage | API-096 200 submission `510f0678…`, revision 2 READY; local 4.6 cm draft save/restart checked separately |

Fresh JSON: `.cache/crew-final-readbacks.json`, `.cache/crew-final-submission-readbacks.json`. Reused safety/review evidence: `.cache/crew-safety-readback-20261115.json`, `.cache/crew-review-readback-20261115.json`.

## 8. File VERIFIED and receipt limits

Fresh API-096 confirms existing server submissions and evidence declarations: dimensions task `837f8fd7…`, submission `aa0809f8…` READY; supplement task `16f6fa58…`, submission `510f0678…` READY with retained evidence. Prior worklogs establish their upload VERIFIED/native submit evidence. This checkpoint did **not** create and verify another image or repeat a historical immutable command. READY readback is not mislabeled as a fresh file-metadata VERIFIED request.

## 9. Error handling and immutable replay

Existing task/item/measure version distinctions, journaled payload/key, scope checks, UNKNOWN_OUTCOME reconciliation and failure guards remain unchanged. Targeted/full tests pass, including the existing suite. Fresh native fault-injection of 401/403/409/412, connection loss during Crew upload, and timeout after submit is **NOT_RUN** in this checkpoint. No HTTP status was fabricated to satisfy this matrix. A list/detail mode mismatch is not a permission failure.

## 10. Recovery, scope and data preservation

- **ANDROID_E2E_VERIFIED:** local measurement draft 4.6 cm survives force-stop/reopen. Screenshot shows local/server values separately.
- **NOT_RUN:** new Crew A→B native session-isolation scenario and interrupted-upload restart scenario. Source/tests are not substituted for native evidence.
- No logout purge, reset, SQLite deletion, journal deletion or media deletion. Existing files, unresolved commands and untracked artifacts retained. New QA mutations have durable intent/result evidence.

## 11. Map / geometry / position

| Capability | Status | Actual evidence |
| --- | --- | --- |
| API-087 WGS84 geometry | HTTP_VERIFIED | GET 200 on dimensions/new FT fixtures; route LineString and two segments; source spatialSrid remains 32648 |
| MapLibre route and segment selection | ANDROID_E2E_VERIFIED for rendering | Native route drawn; selecting Đoạn 1 changes displayed geometry; screenshot `.cache/crew-final-map-segment1.png` |
| Null defectTarget | ANDROID_E2E_VERIFIED | “Chưa có vị trí hư hại” and missing navigation target, disabled navigation action |
| Positive defect marker / actual navigation destination | NOT_VERIFIED | Fresh fixtures have defectTarget null |
| POSITION_CHECKLIST | REUSED_VERIFIED_EVIDENCE | Prior FIELD supplement/readback; current draft UI does not convert map/GPS into authority |
| GPS binding | SUPPORTED only under BE guard | GPS_SOURCE_BINDING_UNAVAILABLE remains distinct from an upload error |

API evidence: `.cache/crew-final-map-readbacks.json`. Existing QA source coordinates around [105, 9.951…] are synthetic fixture geometry, not verified positions on the Ho Chi Minh City pilot route. Rendering this source does not prove real-world survey alignment or cartographic background acceptance. No invented target/coordinates were inserted.

## 12. Offline native crypto audit and separate acceptance plan

`modules/roadguard-offline-crypto/index.ts` still sets `NATIVE_ACCEPTANCE_VERIFIED=false`. Expo Go cannot establish availability/custody of the optional custom native provider. `crewOfflineWorkflow.ts` rejects protected writes with BLOCKED_NATIVE. HANDOVER_GATE remains blocked for KDF/AES-GCM/encrypted-package proof. CrewOfflinePanel diagnostic/read/reconcile capabilities do not constitute full offline mutation acceptance.

Missing native acceptance proof:

1. Dedicated approved native build loads the module; key creation/restart/rotation/deletion and reported security level are verified without plaintext private keys.
2. Real device P-256 SPKI DER / P1363 signing and .NET verification against canonical payloads/numeric domains.
3. Device registration and grant/snapshot validity, expiry/revocation and actor/environment partition checks across restart/session changes.
4. SQLite journal persistence, immutable dispatch/reconcile and durable per-item receipt/readback; UNKNOWN_OUTCOME preserved.
5. Handover KDF, AES-GCM authentication, encrypted package and wrong-key/tampered-ciphertext vectors before enabling those operations.

This phase is **AUDIT + PLAN**, not implementation authorization for new providers/build configuration. No gate was changed, signing/attestation fabricated or offline write enabled.

## 13. Executed quality gates

| Command / gate | Final result | Evidence |
| --- | --- | --- |
| `npx tsc --noEmit` | PASS, exit 0 | `.cache/crew-final-integration-tsc-final.log` |
| Combined targeted six test files | PASS, 50/50 | `.cache/crew-final-targeted-combined.log` |
| `node --test --test-concurrency=2 tests/*.test.cjs` | PASS, 1718/1718, 0 failed/skipped | `.cache/crew-final-integration-full-final.log`, 305168 ms |
| Expo Doctor retry | PASS, 20/20 | `.cache/crew-final-integration-doctor-retry.log` |
| `git diff --check`, staged diff checks | PASS before source commits | Executed commands; CRLF notices are not errors |
| Icon / UD-06 scans | No Ionicons or prohibited presentation terms found in scanned app/src scope | Executed rg scans |
| Changed-source review/privacy | No new credential/token/signed-URL debug logging | Reviewed source diffs; scratch artifacts excluded from Git |

Targeted command: `node --test --test-concurrency=2 tests/register-password-visibility.test.cjs tests/crew-current-mode.test.cjs tests/dot-c-crew-filter.test.cjs tests/crew-field-feedback-state.test.cjs tests/crew-field-instrument-edit.test.cjs tests/t04.test.cjs`.

Earlier unbounded full run exhausted memory; an earlier bounded run exposed nine assertions, corrected before the final green run. Final counts above are the completed bounded run, not partial output. No Android PASS is derived from these Node tests.

## 14. iPhone upload: unresolved, no speculative transport change

Owner screenshot reports `ERR_NETWORK` at storage upload PUT. It does not establish S3 403, signature expiry or a rejected upload. Read the upload transport and existing iPhone proxy. Fresh MinIO health returned 200 both loopback and LAN at 19:46; this is host reachability, not proof that the iPhone can PUT.

Storage proxy log has health GET 200 entries and **no observed PUT**, including the recheck near 19:45. Early proxy rejection is not logged by that proxy, so absence of PUT completion cannot distinguish no request from a rejected/incomplete request. Metro lists only the Android debug target; no iPhone debug target is attached.

A request to the owner to retry the same failing image and send its “Trạng thái ảnh” details is pending. **BLOCKED / NOT_FIXED** until a correlated iPhone attempt is available. No blind ArrayBuffer/Blob swap, URL rewrite, new upload session or key change was made. Do not send this to BE as a confirmed backend defect yet.

## 15. Remaining issues / priority / next checkpoint

| Priority | Owner / status | Concrete next step |
| --- | --- | --- |
| P1 | BE list projection defect | Return actual current mode for API list rows; compare same IDs with API-080, then rerun native filters |
| P1 | FT BE_FIXTURE_BLOCKED / BE_DISCOVERY_GAP | Supply/identify authorized QA warranty/coverage/handover setup; then assessment/start/intake and PM final readback |
| P1 | iPhone upload BLOCKED | Correlate same-image retry with proxy and native error; fix proven cause, verify file VERIFIED and report readback |
| P2 | iPhone UI acceptance NOT_RUN | Recheck password eye and FIELD keyboard/actions on physical iPhone |
| P2 | Crew native negative matrix NOT_RUN | Isolated 401/403/409/412, network/unknown replay and Crew A/B isolation scenarios |
| Separate audit scope | Crypto native acceptance BLOCKED | Owner-approved dedicated native acceptance plan above; keep production gate false |

Other than list projection, this checkpoint does not establish missing/new BE APIs. Null target and synthetic route alignment are fixture limitations; API supports the fields. Source-mapping prerequisites are reported precisely, not as a blanket request to rewrite BE.

## 16. Backend integrity

No BE source, SQL, migration, Docker, MinIO, seed scripts or runtime config were edited. Read-only helper functions were imported from an existing seed module, but its seed main was not executed. State changes were only the authorized private QA PM fixture and Crew acceptance through official APIs.

## 17. Git delivery

**No FE or BE push.** No reset/clean/stash/rebase. Source checkpoints are local commits; report committed separately after status/HEAD/diff review. Tracked source was clean after the three source commits. Existing untracked cache, SQLite, native build files and test logs retained and excluded from staging.

## 18. Acceptance boundary

Fixed: registration visibility control; compact FIELD editor and keyboard handling; current task-mode adapter/filter support. Verified new Android draft persistence, conditional detail/acceptance and MapLibre rendering, plus fresh HTTP readbacks. Reused existing normal/safety/review/FIELD evidence without destructive replay.

**Not a full Crew/iPhone completion claim.** FastTrack final sequence, physical iPhone upload/UI and the explicitly listed new native fault scenarios remain blocked/not run as detailed above. Stop this scoped checkpoint without switching roles or enabling offline crypto.
