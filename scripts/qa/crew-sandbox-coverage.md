# Crew sandbox: Fast Track execution-start fixture

## Scope and authorization

Owner requested seeding the existing local Crew sandbox to test **Bắt đầu thi công**
on 2026-11-17. Owner clarified: API data seeding is allowed; BE source, config and
build changes are forbidden. This runner lives in FE and calls existing APIs only.

This is an isolated QA scenario, not a real handover, warranty, repair or acceptance.
Both uploaded PDFs explicitly identify themselves as QA documents. The Supervisor
mapping reason records this limitation. No existing `TEST_ONLY` source is relabeled.
The `REAL_SOURCE` mapping exercises that admission branch using new verified uploads;
its success does not establish authenticity of real-world documents.

## Pinned target

- API: `http://127.0.0.1:18181`, compose project `roadguard-crew-sandbox`.
- BE runtime/remote develop: `a54c806d3d3e9f58b678af4cae4aced58a506945`.
- FE runtime source at verification: `08c177a94d657fce1ed520643aefa95e6bedd376`.
- Project: `72f84201-c001-4000-8000-000000000001`.
- Task: `6b12946c-f0e2-47f9-a4f5-89c0fd4308ba` (`CONDITIONAL_FT`).
- Package/item: `c1ba64a3-04be-4aea-b5b2-1c9dc5718fff` /
  `30d4228a-2aad-42fe-916f-0bd94c516a91`.
- Obligation: `1c532ad0-f1c6-47da-b179-096eafbf1ae0`; chainage 89–91,
  lateral offsets 0–1, exact server road/locationVersion/scopeHash.

The runner deliberately refuses another compose project, image revision, API port,
task actor/mode, changed scope, or another mapping already owning the target scope.
It does not seed all projects or all Crew tasks.

## Run

From the FE repo root, Python standard library and Docker CLI are sufficient:

```powershell
python scripts/qa/crew_sandbox_coverage.py
python scripts/qa/crew_sandbox_coverage.py --apply
```

The first command verifies the target without login/data writes. The second requires
owner authorization for this QA scenario. Accounts are read privately from the
container's existing account file. If a fixture account password has changed, supply
it through the process environment (`ROADGUARD_QA_CREW_A_PASSWORD`,
`ROADGUARD_QA_SUPERVISOR_PASSWORD` or `ROADGUARD_QA_PM_A_PASSWORD`); never commit it.

Keep the same `.cache/crew-coverage-fixture-20261117` journal directory on reruns.
Do not delete it or choose a fresh directory to retry an uncertain command. The
journal persists actor, environment, resource, body, key and original If-Match before
each POST. Transport failures retain unknown outcome; reconcile reads before exact
replay. Tokens, passwords and presigned URLs are excluded from durable evidence.

Flow: upload two distinct `DOCUMENT` PDFs → multipart PUT → complete/poll `VERIFIED`
→ attach/create project handover → Supervisor confirms the exact obligation scope
using current source versions, scope hash and ETag → Crew reads API-146.

The script does not press start, finish, submit reports or approve repairs. It does
not modify SQL, reset storage, delete pending artifacts, change first-start time,
extend the Fast Track entitlement, or modify BE code/configuration/builds.

## Executed evidence (2026-11-17)

Before: API-146 HTTP 200 with `eligible=false`, `UNKNOWN_OWNER_MAPPING`, and
`COVERAGE_MAPPING_UNKNOWN`, `EXECUTION_ROADNOTHANDEDOVER`,
`ROAD_HANDOVER_MAPPING_UNKNOWN`. Coverage history was empty.

After API fixture setup at 23:20 Vietnam time:

- Two uploaded files reached server `VERIFIED`:
  `ac6674a9-2bbf-4d04-9b60-56bbb068a381` (handover),
  `788a8369-7eb5-4637-a6c8-b5a66fb97a3c` (maintenance basis).
- Handover: `f4e486a8-d7e3-4764-ba81-276f6db96f23`.
- Mapping: `98e7b406-ad74-49c1-8576-68627a80d535`, exact target scope only.
- API-146 HTTP 200: `eligible=true`, `activation=ELIGIBLE`,
  `sourceMapping=CONFIRMED`, `missingReasons=[]`.
- Original assessment `e8144cc8-e73f-491d-b844-72ca068298c0` and measurement
  `6d3d2293-d247-41a3-a952-1a18f435e941` remained unchanged.
- Entitlement expiry remained `2026-11-18T15:51:20.6461218Z`
  (22:51 Vietnam time); coverage validity does not extend this deadline.

On local Pixel_6_Pro / Android 14 / Expo Go, the actual **Bắt đầu thi công** button
was pressed. UI changed to **Đang thi công** with **Kết thúc thi công**. Fresh Crew
task GET and PM item-history GET both returned HTTP 200, item state `InProgress`;
history version `AAAAAAADD7A=`. This is `ANDROID_E2E_VERIFIED` for the start step
and `HTTP_VERIFIED` for fixture writes/readbacks. Metro showed the POST URL but
could not recover its response status/body; the start result is supported by UI
and independent server readback, not an asserted captured POST receipt.

The task was left in progress for the owner to test finish → AFTER photos → report.
Finish, attempt submission and PM acceptance: `NOT_RUN` in this checkpoint.
Supervisor confirms source/scope; PM handles final Fast Track acceptance.

Rerunning the fixture runner after start left the command journal identical and
created no additional upload/handover/mapping commands. All old photos/measurements
were retained. BE tracked diff remained empty; existing untracked operator artifacts
were left intact.

Local evidence (not committed): `commands.json`, `auth.jsonl`, `readback.json`,
`item-history.json` under `.cache/crew-coverage-fixture-20261117/`.

Safety tests:

```powershell
python -m unittest discover -s scripts/qa -p test_crew_sandbox_coverage.py -v
```

Five tests passed: wrong target rejection, immutable retry after timeout, actor-switch
rejection, server-error unknown outcome, and exclusion of presigned URLs from journal.
`npm run typecheck` passed. `node --test tests/*.test.cjs` passed 1829/1829 tests
(zero failures/skips; 105534 ms). `git diff --check` and changed-file secret pattern
scan passed. Fixture runner and its safety tests were committed as `fdb595a`.
