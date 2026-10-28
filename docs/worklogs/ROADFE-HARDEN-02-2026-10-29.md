# ROADFE-HARDEN-02 — 2026-10-29

## Scope, authority and attribution

- Mode: Codex `IMPLEMENT_AND_SELF_REVIEW`; baseline `0dbbb9f7e03c5cbca930ff43883304bc420340b5`, branch `main`.
- Owner order: `D:/Downloads/ROADFE_HARDEN_02_GIAO_CODEX_TIENG_VIET_2026-10-29.md`, both referenced replay/audit reports, current AGENTS/skills/governance, actual FE and BE source. Report 5 was not used as a business authority.
- BE develop checked/pinned: `HoangAnhVu2207/RoadGuardSystem@01cc4725b178199215b02f4ddf7093491a16f2f7`. Candidate3 was read-only. Repair receipt scope is actor/project/operation/key, not JWT sid. Exact POST can execute the original command for the first time; no missing-replay-endpoint claim is made.
- Owner additionally approved **only `src/api/crewFieldDraft.ts`**: historical FIELD source lookup and new-session draft isolation. No API wrapper, SQLite schema, auth client, native dependency, BE, SQL or Docker configuration changed.
- Read-only review: `/root/harden02_review`, baseline above versus final working diff. Reviewer first proved WebView Linking bypass and FIELD dependency blockers; fixes were re-reviewed. Final review: no new P0/P1 found; reviewer executed `git diff --check` exit 0. Reviewer did not edit files or run regression/HTTP/native tests. Test evidence below was executed by the implementing agent.

## Changes by gate

1. **Drone safety:** home keeps real task fetching but displays unknown weather/device/flight readiness. A task list does not certify flight safety.
2. **NORMAL recovery:** journal history can be discovered across sid only for the same current authorized actor/environment/project/task/binding/assignment. Current identity is checked across awaits. Old command rows retain their original sid, body, route IDs, origin, key, If-Match and timestamps. Recovery evidence is stored separately in existing `local_draft`, without schema changes. Storage ID/source mismatch or malformed evidence fails closed. Historical rejected-401 becomes unresolved in the effective view; the original rejection remains unchanged. New 401 stays PENDING. Business rejections do not become automatic replay candidates.
   - UI never dispatches repair on mount/login/network events. Replay requires a warning and explicit confirmation, explaining possible first execution. Dispatcher and UI reject concurrent taps and late-session responses.
   - Stage receipts and fresh Crew authority/readback remain mandatory. API-080 is not treated as a historical per-command receipt list. API-138 is not used by Crew.
   - FIELD restore failure no longer hides repair history. Exact attempt recovery reads its original FIELD session source. Explicit post-finish claim can create an empty current-session FIELD draft from validated repair history, without adopting old media/measurements. Legacy and foreign-session FIELD rows remain intact; an unresolved FIELD submission still blocks new work requiring reconciliation.
3. **Map boundary:** safe JSON serialization, finite WGS84 validation, DOM text nodes/event listeners, bridge schema/current-marker checks, CSP and local-document navigation guard. `originWhitelist=['*']` deliberately funnels every navigation through the deny callback: the installed WebView otherwise opens non-whitelisted URLs with Linking before calling that guard. External window/file access is blocked. Fake offline schematic was removed; native map rendering is not certified here.
4. **Legacy:** progress/complete are inert locked routes, with no dormant repair mutation handlers. Bootstrap mock/legacy transports were removed; legacy mutation exports still reject. Live Drone codes no longer import seed data or invent an HH prefix. Unused `operator-uploads.ts` and unused high-level `uploadOperatorFileReal` were removed after caller/export search; low-level real Drone wrappers and locked UI remain.
5. **Reporter P2:** red hook test proved Home navigation before owned-draft restoration. AuthGuard is now the single login restoration/navigation owner, checks exact owner/environment/session, preserves guest/foreign drafts, cancels stale results, and offers retry after restoration errors. Stack remains mounted. Existing RPT-01/RPT-02 stores and retention rules were not modified.

Optional cosmetic style extraction was not needed and remains backlog.

## Regression evidence

Node `v22.15.1`; tests use actual shipped TS/TSX through hook/VM harnesses, installed WebView wrapper, actual journal code and isolated Node SQLite files. These are **LOGIC_TESTED**, not a React native renderer or Android E2E.

Red reproductions retained locally:

| Evidence | Result before fix |
|---|---|
| `.cache/harden02-ui-red.txt` | 0/5 PASS: safety, locked legacy, mock display/bootstrap |
| `.cache/harden02-repair-red.txt` | 0/6 PASS: cross-sid phases and 401 |
| `.cache/harden02-map-red.txt` | 0/4 PASS: hostile input/navigation/bridge |
| `.cache/harden02-reporter-red.txt` | 1/3 PASS: premature redirect and late restore |
| `.cache/harden02-dormant-red.txt` | 5/6 PASS: dormant upload pipeline |
| `.cache/harden02-field-red.txt` | 0/1 PASS: old-session claim source |
| `.cache/harden02-journal-id-red.txt` | 0/1 PASS: corrupted durable storage ID |

Final command: `node tests/automation/run.cjs` — exit **0**.

- **626 tests PASS, 0 FAIL, 0 skipped/cancelled**: 579 existing cases retained plus 47 new hardening cases.
- Evidence: `.cache/fe-auto-rdRjDa/regression.log` and `evidence.json`.
- `npm run typecheck` executed by runner: **exit 0**, `.cache/fe-auto-rdRjDa/typecheck.log`.
- `git diff --check`: **exit 0**, `.cache/fe-auto-rdRjDa/diff-check.log`.
- Existing 401 cases were corrected to assert unresolved immutable replay rather than terminal business rejection; other rejection checks remain. Existing Reporter login ownership test now also mounts actual AuthGuard with shared real stores. Legacy route tests assert inert mounting; their boundary isolation tests remain.
- New coverage: disk write/close/reopen/new sid for PREPARED/PENDING/ACKNOWLEDGED/CONFIRMED/historical REJECTED401; immutable originals; start/finish/attempt replay sources; session/actor/environment/project/task/binding/owner failure; timeout/late logout/double dispatch; malformed journal/overlay; explicit UI confirmation with old FIELD unavailable; FIELD retention and no photo adoption; hostile map text/bridge and installed whitelist-to-Linking behavior; Reporter delayed restore/failure/provenance.
- Scoped diff review and secret scan performed before commit; no credentials, tokens, signed URLs, personal records, .env, database, build output or pending artifacts staged. Public map asset URLs and synthetic fixture values are code, not private capability URLs.

## HTTP and acceptance limits

`node tests/automation/run.cjs --http-read` ran once during final regression correction. HTTP evidence remains valid independently of its earlier three obsolete UI-test assertions: `.cache/fe-auto-ZLsN5k/reporter-http-read.log`; readiness **200**. No report/upload/repair workflow POST was sent; login was the sole POST. No shared assignment was changed.

| Surface | Evidence / status |
|---|---|
| Candidate3 `/ready` | **HTTP_VERIFIED** read, 200 |
| API-215 `GET /reports` | **HTTP_VERIFIED** anonymous 401 and authenticated list 200 |
| API-210/217/218 private resource probes | **HTTP_VERIFIED** anonymous 401 / absent-resource 404 only; positive resource/download bytes **NOT_RUN** |
| API-156 assessment / API-161 start / API-160 finish / API-157 attempt | Existing real wrappers/callers retained: **API_CONNECTED**, recovery **LOGIC_TESTED**. Cross-login HTTP mutation **BE_FIXTURE_BLOCKED**: no authorized private repair fixture used |
| API-080/094/096 repair authority/FIELD readback | Existing callers retained; recovery source/readback logic tested with fixtures. Positive live repair workflow **NOT_RUN** |
| Native/WebView rendering and key provider | **NOT_RUN**; no new native claim |
| Android E2E | **NOT_RUN**; no emulator/device execution |

Remaining locked scope: unresolved FIELD submission recovery requiring authoritative reconciliation; revoked/mismatched binding or unknown receipts; FastTrack/correction gaps, signed offline mutation and Drone mutation prerequisites inherited from baseline. No gate was opened for those capabilities. Weather/device safety source remains unavailable and is shown as unknown. No known new P0/P1 remains in implemented scope; this is not whole-Mobile API or Android acceptance.

## Delivery

Checkpoint is one HARDEN-02 commit. Before committing/pushing, origin URL and fetched `origin/main` were verified against baseline; stage uses explicit paths. No reset, clean, force push, artifact deletion or journal/data migration was used. `.cache/`, Android build output and `mydatabase.db` remain local and untracked. Commit SHA is reported in the delivery message rather than self-referenced inside this file.

## File inventory and line counts

Line anchors refer to the delivered files; counts are after hardening. Gate details above describe the changed behavior.

| File / source anchor | Lines |
|---|---:|
| `app/(auth)/index.tsx:1` | 493 |
| `app/(crew)/complete.tsx:1` | 14 |
| `app/(crew)/progress.tsx:1` | 14 |
| `app/(crew)/wo-detail.tsx:1` | 338 |
| `app/(drone)/home.tsx:1` | 431 |
| `app/_layout.tsx:1` | 176 |
| `src/api/crewFieldDraft.ts:1` | 449 |
| `src/api/crewRepairDraft.ts:1` | 232 |
| `src/api/crewRepairWorkflow.ts:1` | 306 |
| `src/api/droneApi.ts:1` | 637 |
| `src/api/operator-task-view.ts:1` | 51 |
| `src/api/operator-uploads.ts` | deleted (no live callers) |
| `src/components/map/RoadGuardMapLibre.tsx:1` | 569 |
| `src/components/map/mapWebViewSafety.ts:1` | 31 |
| `src/hooks/useRepairBootstrap.ts:1` | 250 |
| `tests/fix01-ui.test.cjs:1` | 132 |
| `tests/hardening-field.test.cjs:1` | 61 |
| `tests/hardening-map.test.cjs:1` | 17 |
| `tests/hardening-repair.test.cjs:1` | 76 |
| `tests/hardening-reporter.test.cjs:1` | 23 |
| `tests/hardening-ui.test.cjs:1` | 34 |
| `tests/helpers/roadfe-screen.cjs:1` | 79 |
| `tests/t04.test.cjs:1` | 124 |
| `tests/t06b.test.cjs:1` | 203 |
| `tests/t06c.test.cjs:1` | 247 |

Architecture backlog (separate approval): large API modules should split by operation family; FIELD/journal modules by persistence versus authority validation; task detail by capability UI. No behavior refactor was performed solely to reduce line counts. The worklog itself is the remaining changed file.
