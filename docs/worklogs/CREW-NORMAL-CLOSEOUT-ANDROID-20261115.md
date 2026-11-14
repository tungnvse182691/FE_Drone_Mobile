# Crew NORMAL closeout and UI verification

- Reviewer: Codex; mode: IMPLEMENT_AND_SELF_REVIEW (not independent review).
- FE base: `19f46f5e1ec219198e870befc22174bd8496d45e`; BE pinned: `85879fe9082774cf5098a9ba281f56b9c651f8ea`.
- Environment: local roadguard-crew-sandbox, API port 18181, image crew-85879fe; Android emulator-5554, Expo Go, Metro 8090.
- Scope: current repair decision display, FIELD historical readiness display, grouped command history and closeout actions. No BE source/schema changes.

## Contract checked

Current BE `RepairWorkflowRepository.Producing.cs`, PM attempt review: ACCEPT requires exactly `AFTER_ATTEMPT_BINDING_UNAVAILABLE` in the original FIELD submission, validates repair lineage, verified files and AFTER capture after execution finish, then creates repair evidence references. Thus this historical FIELD readiness alone is not a missing API. Current task repairContext and finalDecision are separate authority for repair acceptance.

Compared with Crew `03_NORMAL-and-FastTrack-Execution.md` and C04 bootstrap. PM acceptance is not final NORMAL acceptance; Supervisor owns the final confirmation.

## Executed integration evidence

Dedicated QA project `72f84201-c001-4000-8000-000000000001`, task `91f8a58c-98c5-49ed-8584-5bf1cfd7b9db`, package `7da884c8-8d3f-4afb-b412-0bdff8f8607a`, item `d2533731-80ef-4f37-be3b-3dffbc40af4d`.

ANDROID_E2E_VERIFIED for this NORMAL fixture: accept/start task, measure 3.5 cm, chainage checklist 75 m, BEFORE photo upload VERIFIED, READY assessment, start/finish execution, explicit post-repair capture checklist, AFTER upload VERIFIED, FIELD submit/readback, formal repair intake/readback. Camera black image is expected emulator output, not a field survey.

- Assessment `d4150a0f-1dd2-4c38-affc-524bd5ffce13`.
- Execution start `44b2b9d9-ebad-48d0-a065-b75f74d2619d`; finish `f1b7b3ec-6678-45fd-82f7-3f2a4732b3ee`.
- BEFORE file `bbec6a47-5764-4308-a791-9d69860fde35`; AFTER `9cdf3c11-415b-4ece-a10b-81ee3bd3947a`.
- FIELD `7147b24e-a136-462d-94c7-d805dd060f53`; intake `54499e60-7385-4df2-aad6-fe0fd09863b8`.

HTTP_VERIFIED mutations on this dedicated fixture using PM/Supervisor test sessions and a durable pre-POST journal with immutable headers/body/key:

- API-158 PM ACCEPT: 201; review `0fc861d6-ff5a-4e18-af18-30be946bc271`.
- API-147 Supervisor final confirmation: 201; decision `8d567f5b-fc57-4cd5-af20-aeb6d9a6d23f`.
- API-080 Crew readback: task Completed, repairContext Confirmed, finalDecision CONFIRMED, itemVersion `AAAAAAACE3s=`.
- Local journal: `.cache/crew-normal-native-manager-20261115-journal.json` (not committed).

ANDROID_E2E_VERIFIED after manager confirmation: current acceptance displayed in closeout and FIELD screens; technical history expand/collapse works; existing FIELD remains reachable; server AFTER photo opens in full-screen preview with close button. Recovered one uiautomator hierarchy failure by reconnecting and inspecting again; no storage reset.

## Fixes and regression

1. Old local intake receipt no longer claims manager has not accepted after a current final decision.
2. Final acceptance requires BOTH current context Confirmed and finalDecision CONFIRMED. Completed alone and PM ACCEPT alone never imply final acceptance.
3. FIELD INCOMPLETE snapshot retained unchanged, labelled as result at submission time; current repair decision appears separately. Original missing reasons remain under details.
4. Confirmed journal rows collapsed behind a proper secondary button; unresolved commands stay visible. Cards group plan and closeout information.
5. Field editor uses a short assessment card linking to execution tracking. Accepted/final closeout hides obsolete new-submission actions and retains saved dossier viewing.

LOGIC_TESTED:

- Added failing acceptance/readiness regression first (6 pass, 1 fail), then fixed: 7/7 pass in `tests/crew-field-feedback-state.test.cjs`.
- Updated existing history test to expand confirmed history explicitly and verify no extra POST.
- `npm run typecheck`: exit 0.
- `node --test tests/*.test.cjs`: 1660 tests, 1660 pass, 0 fail; local `.cache/crew-final-regression-20261115.log`, duration 159417.8976 ms.
- `git diff --check`: clean. `rg` scans app/src for Ionicons and app for financial labels: no matches.

## Limits / next checkpoints

No new BE contract gap found in this NORMAL closeout chain. This does not establish all-role completion, full native offline crypto/handover, FastTrack end-to-end or all Operator reassignment/supplement cases. Prior Reporter and Crew evidence remains in their separate worklogs. Actual field geography and hardware crypto are not proven by this emulator fixture.
