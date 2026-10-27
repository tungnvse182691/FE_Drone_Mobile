# CODEX-T05A — Crew FIELD commands

Date: 2026-10-28. Baseline: `35d6e53fbff07cad4d72c262a2e2dcc4d76d2332`.

## Scope and contract

Production changed: `app/(crew)/wo-detail.tsx`, `src/api/crewApi.ts`. `tasks.tsx` session/owner boundary reused unchanged. Added T05A regression and read-only HTTP smoke tests. No BE, Docker, SQL, client retry, repair mutation, offline sync, Reporter or Drone edits.

Read AGENTS, RoadGuard/code-review skills, Crew Matrix C-04/C-05, API catalog 081/091/093/094 and Candidate3 FieldInspectionWorkflow controller, DTO, service, repository/business guards and domain transition source. Source routes and permissions are authority:

| API | Contract used |
|---|---|
| 081 accept | Crew active project membership and active assignment; `NewAssigned -> Accepted`; `{reason}`; strong task If-Match and Idempotency-Key; 201 task. |
| 091 reject | Same guards; `NewAssigned -> Rejected`; required reason 1–2000 trimmed characters; 201 task; active assignment ends. |
| 093 start | `Accepted -> InProgress`; `{originId, claimedAt}`; UUID client operation origin and stable timestamp persisted before send; 201 new or 200 existing immutable first-start record. No invented device ID/offline proof. |
| 094 start-origin | Crew owner GET; actual server record ID, client originId, assignment and provenance; origin content-hash ETag is **not** task rowversion. |

No GPS, WO label, defect type or task-mode presentation requirement was added to these commands. Real task/project/owner/active assignment, genuine authenticated Crew session, valid status and actual strong ETag remain required. GPS actions stay disabled without authoritative coordinates; repair/FIELD evidence submission remains disabled/out of scope even when first-start succeeds. Missing repairContext is never synthesized.

## Implementation and uncertainty

- Existing detail UI/components retained with minimal command buttons, reason, loading/errors, receipt and reconciliation controls. No mock field-session effects mounted by detail route.
- SQLite command journal is actor/project/task partitioned and contains exact body, If-Match, key, real session identity and command state. No Bearer token/password stored in the journal. Storage failure blocks sending; no memory fallback. UUID from expo-crypto is a **client operation origin**, not a fabricated server record ID.
- One in-flight command per actor/task. Session and actor checked after each asynchronous boundary. Explicit replay uses the original body/key/If-Match; a new session for the same actor may GET-reconcile but cannot replay an old-session command. Other actors cannot read/replay that record through the command port.
- GET080 follows POST outcomes, including transport errors. GET094 verifies actual immutable first-start and GET080 supplies current task status/version. No optimistic task status/version or success on timeout. Read failures never restore cached detail as freshly confirmed.
- A definitive first-send 4xx rejection is retained separately from an unknown outcome; current owner-validated GET lets the user create a new command with fresh version. A replay error remains ambiguous, including reject replay403 after assignment loss. Such pending intent stays locked for reconciliation rather than getting a new key.
- Reject ACK plus GET403 is explicitly shown as acknowledged with readback unavailable; no claim of GET confirmation. If the app restarts after rejection, the owner boundary can itself deny task access; journal persists for reconciliation, and the inbox remains usable. No PM endpoint workaround.
- No background command replay or modification to repair/offline outbox. Journal uses existing local_draft storage; native SQLite restart acceptance is NOT RUN (logic tests simulate durable restoration).

## Verification

| Check | Result |
|---|---|
| Preflight | HEAD/main clean and both at baseline; `/ready` 200. |
| TypeScript | `npm run typecheck`, exit 0. |
| Existing T01–T04 | 122/122 PASS, unchanged tests. |
| T05A regression | 27/27 PASS; full combined suite 149/149 PASS, 0 failures. |
| Whitespace | `git diff --check`, exit 0. |
| Independent review | P1 conflict recovery, P2 stale confirmed readback/reload and reassignment recovery fixed with RED-to-GREEN regression; native UUID corrected. No remaining known P0/P1 in T05A. |
| Android E2E | **NOT RUN**, no emulator opened. |

Executed production controller/guard/wrapper logic in VM transport fixtures, including exact DTO/headers; accept/reject/start status guards; missing GPS/project/assignment/owner/ETag; 403/409/412; timeout and stable replay after serialized restoration; actor/session switch during POST; old-session read-only reconciliation; origin readback; storage failure; stale journal conflict; definitive rejection and reassignment. Screen harness executes real UI hooks and button handlers; this is not native rendering/E2E.

### HTTP evidence — Candidate3, read only

`node tests/t05a-http-smoke.cjs`, exit 0. Credentials loaded in memory from existing local handoff; no tokens, credentials, task IDs or signed URLs printed/persisted in evidence.

| Operation | Observed | Classification |
|---|---|---|
| `/ready` | 200 | HTTP_VERIFIED |
| API037 inbox | anonymous401; Crew A200, one assigned task; Crew B200, empty; refresh200 | HTTP_VERIFIED read |
| API078 list | owner200; anonymous401 | HTTP_VERIFIED read |
| API080 detail | owner200, owner/version/strong ETag validated; anonymous401; other Crew403 | HTTP_VERIFIED read |
| API094 origin | owner200 with actual server ID/task binding; anonymous401 | HTTP_VERIFIED read; no new origin created |
| API081 / API091 / API093 | **NOT RUN / BE_FIXTURE_BLOCKED** | No dedicated safe mutation fixture supplied; shared demo assignment unchanged. Production commands covered by transport fixtures, not HTTP mutation acceptance. |

## Eight invariants and delivery limits

Scoped diff review: MaterialIcons only; no UD-06 costs/material consumption; grouped navigation and existing keyed session boundary, no RootLayout change; Crew-only operation paths; no new defect codes; no new branding/prefix/technology; BE identities/ETags/statuses and nullable GPS retained; auth/network/concurrency failure handling explicit. Secret scan found no literal credentials/tokens, signed URLs, private keys or environment files in added diff.

| UI / workflow | Status |
|---|---|
| C-04 detail, accept/reject | API_CONNECTED; guards/buttons/receipts/retry logic tested; real HTTP mutations pending fixture. |
| FIELD start and origin | API_CONNECTED; origin GET HTTP_VERIFIED; start mutation pending fixture. |
| Inbox and navigation | Existing T04 reads preserved; no GPS navigation when destination absent. |
| FIELD evidence/submission, repair execution | BLOCKED/out of T05A; legacy mock code remains in downstream components and the unmounted legacy detail implementation. No T05B/T06 claim. |

Open blockers: dedicated private Crew mutation fixture; Android/native restart acceptance; existing missing GPS metadata and P5-G02 repairContext=null in shared fixture. No known new P0/P1 in the bounded T05A integration; mutation/native workflow acceptance remains pending. No production-ready claim. Fetch origin/main and verify unchanged baseline again before normal commit/push; never force push.
