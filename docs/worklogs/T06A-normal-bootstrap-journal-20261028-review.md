# T06-A — NORMAL repair bootstrap, guards and journal

Date: 2026-10-28. Scope: T06-A only. Reviewed by Codex and an independent read-only reviewer.

## Baseline and source evidence

- FE main/HEAD and freshly fetched origin/main: `fcfc4977a05ce83097bb3e05206f552136a2eb24` before commit; working tree initially clean.
- Origin: `https://github.com/tungnvse182691/FE_Drone_Mobile.git`.
- BE develop checked through GitHub CLI: `01cc4725b178199215b02f4ddf7093491a16f2f7`.
- Candidate3 read-only source: FieldInspectionWorkflowRepository.CrewRepairContext.cs, RepairWorkflow controller/repository/DTOs and RepairWork states. AGENTS, roadguard/code-review, Crew matrix and canonical NORMAL/FastTrack contracts reviewed.
- API mapping: 156 assessment; 157 attempt; 158 PM review (no mobile wrapper); 159 supplement; 160 finish; 161 start. Method/path remain authoritative. Existing incorrect wrapper comments corrected.
- Task ETag is distinct from RepairItem itemVersion. NORMAL context is returned only for server-approved task/Crew/binding/item/assignment/membership conditions. FastTrack is not inferred from this context.

## Dependency audit and files

Audited inbox -> detail -> legacy progress/complete/correction, hook transports, FIELD draft, camera/review, receiving helpers, shared SQLite storage, offline enqueue/dispatch/retry and repair API wrappers. No additional production file is required for A.

| File | Change |
|---|---|
| app/(crew)/wo-detail.tsx | Read-only NORMAL context in the mounted FIELD detail component; legacy detail component remains unmounted. |
| app/(crew)/tasks.tsx | Block progress/complete/repair-correction at the shared boundary, including deep links with otherwise complete presentation data. Read-only detail is independent. |
| app/(crew)/sync.tsx | Quarantine legacy repair/FT row or payload aliases, including old ACK claims; preserve payload, IDs, keys and receipts for reconciliation. Guard immediately before dispatch and before manual retry. |
| src/api/crewApi.ts | NORMAL capability validator, canonical eight-byte rowversion validation, legacy queue classifier and corrected API comments. |
| src/hooks/useRepairBootstrap.ts | Direct authenticated owner-scoped API-080 read; session isolation, stale/unmounted response protection; disable legacy repair command callbacks. |
| src/api/crewRepairDraft.ts | New storage-only immutable SQLite command journal using existing local_draft table. |
| tests/t04.test.cjs | Native harness adds usePathname; existing assertions preserved. |
| tests/t06a.test.cjs | 34 behavioral regressions; production functions with native boundaries and real in-memory SQLite. |
| This worklog | Scope, review and evidence. |

## Design and limits

- Bootstrap requires real Crew session, project/task/owner, assignment, task ETag, NORMAL mode, binding/package/item, itemVersion, plan and checklist. GPS, WO presentation and first-start are not required merely to read context.
- Canonical correction/cancelled item states remain readable. Every repair write capability stays locked; valid context does not enable execution.
- Journal partition: environment/actor/project/task; identity also includes session, package/item/binding/assignment. Store exact payload, key, itemVersion and If-Match in an exclusive transaction. Guard session before/after async boundaries; roll back on account change during insert.
- Same command is repeatable without replacing it. Changed payload/key/binding or relogin cannot overwrite unresolved work. Corrupt records block their own task partition and remain stored; other actors/environments/tasks stay isolated.
- A provides PREPARED storage only. No runtime command is sent, no journal POST dispatcher/reconciliation transition is implemented, and no server success is synthesized. Later phases must add these before enabling repair writes.
- Quarantine preserves old intent bytes and records the prior local state; an old ACK is not treated as trustworthy repair success. Last dispatch guard prevents a concurrently enqueued repair alias reaching HTTP; final quarantine restores blocked state if the generic worker classified its thrown error as retryable.
- Legacy mock/receiving transport declarations and old execution screen internals remain for later scoped work, but repair UI boundaries and command helper prevent their execution. Receiving behavior is outside A.

## Verification

| Gate | Evidence/result |
|---|---|
| TypeScript | `npm run typecheck`: exit 0; reviewer independently ran TypeScript exit 0. |
| Full logic suite | `node --test --test-reporter=tap tests/*.test.cjs`: 216 PASS, 0 FAIL, 0 skipped (182 prior + 34 T06A). |
| T06A tests | NORMAL null/valid/correction context; FT fail-closed; wrong owner/binding/assignment; stale item anchor; actor/session/environment switch; immutable journal/reload/conflict/corruption/storage failure/rollback; quarantine aliases and old ACK preservation; independent FIELD; all three legacy execution deep links remain closed. |
| RED -> GREEN | Initial new functionality tests failed before implementation. Two independent review regressions reproduced 31 PASS / 2 FAIL, then 33 PASS after fixes. Additional execution boundary regression passed; final suite 216 PASS. |
| Diff | `git diff --check`: exit 0. Production scope matches six allowed paths. |
| Secret scan | Scoped tracked diff and untracked additions inspected for JWT, GitHub/AWS credentials, private keys and signed URLs; no secret candidates. Test strings are synthetic rejection fixtures. No env/account dump committed. |
| Independent review | Initial review: no P0/P1, two P2 findings. Both fixed and re-reviewed: APPROVED for T06-A, no remaining actionable findings. Reviewer independently verified 33 tests before the additional boundary-only test. |
| Android E2E | NOT RUN; no emulator launched. Native SQLite lifecycle and rendered UI acceptance remain unverified on Android. |

### Eight invariants (changed scope)

| Filter | Result |
|---|---|
| MaterialIcons | PASS; no Ionicons in changed screens. |
| UD-06 | PASS; no cost/material consumption UI introduced. |
| Fabric/routing | PASS by source review and guard tests; group-prefixed routes, no RootLayout change. Android rendering NOT RUN. |
| Mobile role scope | PASS; Crew only, no management UI. |
| Defect vocabulary | PASS; no new defect codes. |
| Branding/technology | PASS scoped scan; no forbidden branding/technology added. |
| Contract data | PASS logic/source review; real NORMAL positive HTTP fixture remains blocked below. |
| Errors | PASS logic; read errors remain errors, session changes reject results, no optimistic repair ACK. |

## HTTP evidence and remaining gates

Safe existing `node tests/t04-http-smoke.cjs` uses fixture credentials in memory and performs login/read only. No assignment or repair mutation was run.

| Endpoint/scenario | Result |
|---|---|
| /ready | HTTP 200 |
| API-037 Crew inbox/refresh | HTTP 200; Crew 1 one assigned task, Crew 2 empty; anonymous 401 |
| API-078 project task list | HTTP 200; anonymous 401 |
| API-080 task detail | HTTP 200; owner/version/strong ETag checked; anonymous 401, wrong owner 403 |
| Positive NORMAL repairContext through HTTP | BE_FIXTURE_BLOCKED: available task returns repairContext=false; no fake binding/item/version introduced. Unit fixture validates NORMAL logic only. |
| API-156/157/159/160/161 repair mutations | NOT RUN by T06-A scope; execution locked. |
| API-146/FastTrack execution | NOT RUN; not implemented in A. |

No new P0/P1 remains identified in implemented scope. P5-G02 positive NORMAL fixture evidence remains pending; null context alone is not proof of a missing BE feature. Progress, complete, repair-correction, repair reconciliation and FastTrack remain locked/pending later approval. T06-B has not started.

Delivery: approved for T06-A commit/push after final scope/secret/remote checks. This is bootstrap/journal groundwork, not repair workflow acceptance or production-readiness.
