# Crew FIELD supplement / locked editor guidance

- Codex, IMPLEMENT_AND_SELF_REVIEW; base FE eb3e46e. BE contract/runtime 85879fe9082774cf5098a9ba281f56b9c651f8ea; no BE source changes.
- Sources: Crew screen matrix C-07, 02_FIELD-Measurement-Workflow.md; pinned FieldInspectionWorkflowRepository.Intake.cs SubmitAsync parent/start/state checks; src/api/crewFieldDraft.ts retained-evidence validation and command archive.
- Environment: sandbox localhost:18181, emulator-5554 Android 14, Expo Go/Metro 8090, Crew A and isolated PM QA fixture.

## ANDROID_E2E_VERIFIED / HTTP_VERIFIED

Project 72f84201-c001-4000-8000-000000000001, task 16f6fa58-2363-4b68-ac51-2ac8349aeeac:

1. After PM SUPPLEMENT review and Crew request ACK, Android explicitly created a new draft, entered depth 4.2 cm with QA instrument/method, selected segment 1 and chainage 50 m, saved and submitted without another image capture.
2. API-080 GET 200 Submitted; API-096 GET 200 submission 510f0678-f254-40a8-a7b7-399bb31ab03d, revision 2, READY. Parent/root dda350f4-02b6-4c82-bd88-54aeed838781. Compared original review deadline and complete evidence declaration against revision 1: exact match. Depth, unit, instrument and method match Android inputs. No new upload or duplicate evidence required.
3. A second explicitly journaled PM QA SUPPLEMENT review of revision 2 returned 201 (9d07c99a-8602-40b5-9bbf-4ffaef99feda); task readback SupplementRequired. Used only to verify the corrected frozen-result presentation. Android showed receipt plus new-draft action, no edit/capture buttons until explicit new draft.
4. After creating that new draft, screenshot inspected the retained-evidence guidance below position and measurement cards. Text stays inside the card, with aligned action below. This third draft remains local and was not submitted. Logout retained local data; cross-account privacy is not established by logout alone.

Evidence: .cache/crew-supplement-readback-20261115.json, .cache/crew-field-supplement-ui-review-20261115.json. Original commands/receipts preserved.

## Fixes / self-review

1. Frozen commands previously exposed misleading edit entry points. Hide edit cards and capture action while immutable command is present; reconciliation/new-draft actions remain. No journal or replay rule changed.
2. Empty new capture list previously said no photos existed even when API-096 had retained evidence. Explain that existing photos are retained and new photos are optional. No inferred VERIFIED status: existing submission validation still checks each retained file.

Regression RED: two new assertions failed before fix. GREEN: focused 60 tests passed. Full suite initially found an older test trying to open the now-hidden editor for a pending command; updated its assertion to require absent editor controls and present exact-command reconciliation, preserving unchanged stored command.

- node --test tests/*.test.cjs: 1643 passed, 0 failed/skipped; .cache/crew-supplement-ui-full-final-20261115.log.
- npx tsc --noEmit: exit 0.
- git diff --check: clean. No new icon, dependency, role, route, wire or permission.
- No new BE contract gap established. Entire three-role audit and native offline acceptance are not claimed by this checkpoint.
