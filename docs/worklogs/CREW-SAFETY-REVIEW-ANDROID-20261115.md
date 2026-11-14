# Crew safety / review Android checkpoint — 2026-11-15

Mode: IMPLEMENT_AND_SELF_REVIEW. Base FE d51a808. BE origin/develop fetched and pinned at 85879fe9082774cf5098a9ba281f56b9c651f8ea; sandbox API localhost:18181. No BE source or SQL changes.

## Contract and scope

Read Crew screen/API matrix, RepairSafetyService.CheckAsync, CrewSafetyWorkflow/Draft and CrewReviewRequest sources. API-152/153 use measure versions and eligible evidence link IDs; API-150 uses repair item version and API-080 final decision/readback. Fixtures below are isolated QA resources.

## Android + HTTP executed

- Crew task ebcdca88-ce04-40e9-80b5-be23e1286a13: opened assigned safety facts, safety check form, selected Safe, entered QA findings, loaded private image preview, selected its eligible link and submitted. The black image is an emulator capture, not a preview failure. Success notice rendered within a card.
- API-152 GET 200 confirmed exactly one new check 15f29522-6023-4c9b-8ff8-21aba72d4285, actor 72f84201-a001-4000-8000-000000000008, result Safe and evidence link 36cbf9e2-0e92-4555-b918-71c2a4f02274. Android facts refreshed to three checks. Evidence: .cache/crew-safety-readback-20261115.json.
- Crew task ce4ba53e-47fa-4f01-aec6-77ee1e4beaa8: opened current final decision and previous request, submitted a new QA review request through Android. API-080 GET 200 confirmed exactly one matching request 6baf4c35-b845-4e02-8b64-b47a056abea9 linked to current decision fa6dd877-fbb3-4d5e-b53a-c68cefc7286b. Final decision unchanged. Evidence: .cache/crew-review-readback-20261115.json.
- Safety/review headers, inputs, image selection, notices and fact cards visually inspected on emulator-5554 (1440x3120). This is evidence for these flows only, not every Crew screen.

## Fix and verification

- Android hierarchy exposed shared Button as label "busy" for an idle safety submit button. Added explicit action label and a boolean default for loading. Matches React Native accessibilityLabel/accessibilityState guidance: https://reactnative.dev/docs/accessibility.
- New runtime regression failed before the fix and passed afterward for idle/loading/disabled variants. Reopened safety form on Android: button now exposes label "Gửi kiểm tra".
- node --test tests/button-loading-label.test.cjs: 3 passed.
- node --test tests/*.test.cjs: 1,631 passed, zero failed/skipped; .cache/crew-safety-ui-20261115-full.log.
- npx tsc --noEmit: exit 0. git diff --check: exit 0.

These checks do not establish offline cryptographic acceptance, process-death recovery, or full three-role coverage. Those remain separate work, not PASS inferred from these results.
