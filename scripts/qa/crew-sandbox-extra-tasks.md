# Crew sandbox: ten additional conditional Fast Track tasks

## Scope and authority

- Owner authorized ten additional test tasks through existing sandbox APIs; BE code/config/build remains read-only.
- FE base: `ac1adc28173c13ecd3085a638b8722670ce1bbcc`; runner checkpoint: `76f2bd1`.
- Mode: IMPLEMENT_AND_SELF_REVIEW. Self-review by Codex; no independent review claimed.
- Target: `http://127.0.0.1:18181`, compose `roadguard-crew-sandbox`.
- Runtime revision: `a54c806d3d3e9f58b678af4cae4aced58a506945` (pinned image; local BE checkout is older).
- Observed: `2026-11-17T16:52:59.473867+00:00`.
- Only new isolated fixtures were mutated. Existing photos, measurements and tasks were preserved.

## HTTP_VERIFIED: fixture mutations and readbacks

- PM: ten repair-package creates, ten FAST_TRACK item proposals and ten assignments, all HTTP 201.
- Supervisor: one new DOCUMENT upload (create 201, part URLs 200, object PUT succeeded, complete 202, GET VERIFIED), plus ten coverage mappings HTTP 201.
- Crew A: all ten detail GETs and eligibility GETs HTTP 200; paginated task inbox contains all ten distinct server task IDs.
- Every task is `NewAssigned` / `CONDITIONAL_FT`, item `Assigned`, policy `CONFIGURED`, coverage `CONFIRMED`.
- Each has null `originalVerifiedStart` and `executionExpiresAt`. No accept/start/assessment/measurement/photo/repair-report command was sent by this batch.
- Exact same-journal rerun succeeded; SHA-256 of commands.json unchanged, proving no additional business mutation commands were added or sent on resume. Authentication requests are separate.

### Fixture provenance and limits

- Synthetic disjoint scopes 110-148m, offsets 0-1m, on the existing sandbox defect `339d8a3b-64c9-4a80-9fcd-ca2979acba2c` and physical road `fc332a75-2f9b-4825-8e25-106c71cf8edd`.
- Existing sandbox road naming is retained; this does not establish real corridor geography or replace canonical project data.
- Reused only the owner-authorized QA handover `f4e486a8-d7e3-4764-ba81-276f6db96f23`; uploaded a new explicitly labelled QA maintenance PDF.
- Mapping uses existing REAL_SOURCE admission branch with an explicit isolated-QA reason. Source provenance remains SOURCE_NOT_EXTERNALLY_VERIFIED. No TEST_ONLY record was relabelled. This is not production road evidence.
- Local durable journal: `.cache/crew-extra-ten-20261117/commands.json`; sanitized readback: `summary.json`. Credentials/tokens/signed URLs are excluded from these artifacts and commits.

## Test tasks

| Name | Crew task ID | Synthetic chainage (m) |
|---|---|---|
| SUA-NHANH-MOI-01 | `0e3e4303-a52f-4acb-8f66-9e9fc842d969` | 110-112 |
| SUA-NHANH-MOI-02 | `561dacab-5958-4c91-be88-fc1d0c8266c6` | 114-116 |
| SUA-NHANH-MOI-03 | `2ee42d16-6fb9-4523-8adb-0d0f4ad0c47e` | 118-120 |
| SUA-NHANH-MOI-04 | `8bfc4f14-b4eb-482f-8e44-5f49324195c5` | 122-124 |
| SUA-NHANH-MOI-05 | `3f261a8d-209f-49ce-948d-de1041f61458` | 126-128 |
| SUA-NHANH-MOI-06 | `9704460f-1e42-46fa-868d-3bb31f819809` | 130-132 |
| SUA-NHANH-MOI-07 | `4f8f0959-7b4b-4a93-b0d4-129885ead90a` | 134-136 |
| SUA-NHANH-MOI-08 | `95fa101f-e07f-40f8-b606-d8bef9808009` | 138-140 |
| SUA-NHANH-MOI-09 | `48dfbf26-8026-478e-a252-3a622b6f3a59` | 142-144 |
| SUA-NHANH-MOI-10 | `165d68c6-9ad7-43b4-b690-b1f715830678` | 146-148 |

## What the owner still tests on Android

1. Refresh Crew tasks and accept one new assignment.
2. Follow the field workflow: start field session, attach valid BEFORE evidence, capture measurements and submit the assessment.
3. Server eligibility must pass current policy before starting repair. These newly assigned tasks intentionally still report ASSESSMENT_REQUIRED, FIRST_START_NOT_VERIFIED and CURRENT_EXECUTION_AUTHORITY_DENIED.
4. Once eligible, start repair, finish, capture AFTER and submit the repair report. PM reviews the result; coverage mapping is not Supervisor approval of a Fast Track result.
- ANDROID_E2E_VERIFIED for these ten new tasks: NOT_RUN; left unstarted for owner testing. HTTP fixture readbacks do not prove new-task Android start/end/report flows.

## Earlier start error, in plain terms

The earlier fixture already had measurements/photos, but lacked an accepted handover and coverage link for its road scope. BE could not verify the source authorizing repair, so it blocked start. Adding QA documents and a Supervisor coverage mapping through existing APIs supplied that missing prerequisite. No BE code guard was removed.
Previous checkpoint observed the Android start button succeed and read back InProgress. A fresh read during this batch now returns `Submitted` for task `6b12946c-f0e2-47f9-a4f5-89c0fd4308ba`; original verified start remains `2026-11-17T15:51:20.6461218+00:00`. This batch did not submit or otherwise mutate that task.

## Verification

- `python scripts/qa/crew_sandbox_extra_tasks.py`: dry-run target identity/revision/port verified.
- Authorized `--apply` run: 10/10 created and read back; same-journal rerun: 10/10, command journal identical.
- `python -m unittest discover -s scripts/qa -p "test_crew_sandbox*.py" -v`: 9 passed.
- `npx tsc --noEmit`: exit 0.
- `node --test tests/*.test.cjs`: 1829 passed, 0 failed/skipped; log `.cache/crew-extra-ten-regression.log`.
- New Python sources parse; targeted credential/JWT scan passed; staged `git diff --check` passed.
- App/runtime/navigation/crypto/provider files untouched. New-task native/Android flow remains NOT_RUN.
- BE tracked diff remains empty; pre-existing untracked operator seed files remain untouched.
