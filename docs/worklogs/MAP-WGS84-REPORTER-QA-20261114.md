# Crew/Operator maps and Reporter edge QA — 2026-11-14

Mode: Codex IMPLEMENT_AND_SELF_REVIEW. This is self-review, not independent review.

## Sources and environment

- FE baseline: `a9ccb46d3e7afb712b31680a96b7131090fc003c`, branch main.
- BE develop source: `85879fe9082774cf5098a9ba281f56b9c651f8ea`; local merge HEAD `108855d695eda71bd163ac262aef8f93e36888bc`.
- Contract: BE `deploy/fe-handoff/TASK-MAP-WGS84.md`; Reporter mobile screen/API and session specifications.
- Docker API: `http://127.0.0.1:18181`, image `roadguard-crew-sandbox-api:crew-85879fe`, health HTTP 200. API container replaced; SQL and object storage retained. No BE source edits or SQL writes in this checkpoint.
- Android: Pixel_6_Pro, emulator-5554, Android 14, Expo Go.

## FE changes

- Crew API-087 renders explicit `wgs84Geometry` instead of interpreting source WKT. A source SRID of 32648 no longer prevents rendering the separate WGS84 layer.
- Invalid/null/unsupported geographic geometry is skipped. No metric coordinates, route centre or device GPS are substituted for the defect destination.
- Crew API-080 `defectTarget` feeds the destination marker/navigation. Route-unavailable 409 does not remove an independently available target.
- Compact map card has route and individual segment buttons. Selecting a segment renders its own polyline, without joining unrelated segments.
- Navigation avoids empty subtitle separators and supplies a neutral defect marker label when classification presentation is unavailable.
- Operator API-104 caller already consumes WGS84. No Operator source change was needed here.

## Executed verification

### LOGIC_TESTED

- New map tests first failed (3 failures), then targeted related suites passed 40/40.
- Operator map/import suites passed 16/16.
- Full regression command: `$testFiles = @(rg --files tests -g '*.test.cjs'); node --test @testFiles` — 1,594 passed, 0 failed, 0 skipped. Local log: `.cache/crew-85879fe/full-regression.log`.
- `npm run typecheck`: exit 0.
- `git diff --check`: exit 0.
- App/src icon and UD-06 scans: no banned matches. Changed-file diff checked for secrets.

### HTTP_VERIFIED — map reads

Read audit script `.cache/crew-85879fe/map-audit.py`, result `.cache/crew-85879fe/map-http-readback.json`:

- Crew A: 42 task details returned 200; 15 geometry reads returned 200, 27 returned 409 `source_not_ready`. All 42 `defectTarget` values were null.
- Operator A: 44 work packages and their 44 assigned geometry package reads returned 200.
- WGS84 route/segment fields were returned by the updated running BE.

### ANDROID_E2E_VERIFIED — limited map scope

- Crew task `072c2c15-2f56-4669-b01e-86a26d3545f4`: opened real detail, loaded location/history, saw route render, selected segment 2 and saw its shorter line. Missing target message matched the null API target.
- Operator task `7ad31d42-802f-4525-aa28-4f29f247976a`: opened real work package, map tiles/access-point marker rendered, switched segment 2 to segment 1; selected state updated. This does not establish surveyed route accuracy.
- The Operator access point displays 11.146111 N, 106.459444 E, a Cu Chi anchor sourced from UNESCO tentative-list entry 7038. The existing metric route fixture is separate and synthetic; it is NOT claimed to be that Cu Chi road.
- Crew non-null destination marker and Google Maps launch: NOT_RUN because the current task fixtures have no defect point.

## Reporter QA carried through this work session

- HTTP + Android: Supervisor correction invalidated the final acceptance; Reporter refresh removed the accepted-progress badge while retaining public update history. All three published progress states had also been tested in the preceding QA sequence.
- HTTP privacy: owner report read 200, another Reporter 404; private image owner 200, another Reporter 404, anonymous 401. Android account-switch privacy: NOT_RUN.
- Android + HTTP readback: stale supplement submission hit 412 after image upload; text/photo retained. Explicit new-supplement action succeeded and readback showed exactly one Android supplement/photo, without a duplicate submission.
- Offline-before-upload and process death: draft/photo/journal retained. After relogin the old-session command is discoverable but only supports read-only reconciliation; it cannot currently resume in the new session. Mid-transfer byte interruption: NOT_RUN. This is not a full restart/recovery PASS.

## Remaining issues / precise handoff

1. **Crew destination source/discovery gap:** API-080 and FE support a target, but all 42 current task defects have null Geometry (read-only SQL). BE `FieldInspectionWorkflowRepository.cs:222` requires a valid Point. `CandidateDecisionRepository.cs:161-162` currently creates Report/AI defects with null geometry. No supported geometry-population operation was found in the inspected assessment/verification DTOs. BE should identify the supported source-population workflow or supply a valid point fixture; if absent, implement it. FE must not manufacture a destination or write SQL around the guards.
2. **Old source fixtures:** 27 task geometry reads still return `source_not_ready`; 15 valid task fixtures are available. No replacement of those 27 tasks is claimed. This is distinct from a missing map endpoint.
3. **Geographic demo fixture:** old source route coordinates are synthetic UTM (e.g. 500000/1100000), so their correct WGS84 projection may be in water. Real road source geometry must be supplied through the authorized source-import workflow before claiming a real-place route demo.
4. **GPS location proof:** current BE handoff still specifies POSITION_CHECKLIST. WGS84 display support does not resolve `GPS_SOURCE_BINDING_UNAVAILABLE`.
5. **Reporter old-session recovery:** `reporterRecovery.ts` only reads an owned report and explicitly cannot prove a particular prior command committed. It preserves UNKNOWN rather than marking it sent. A safe resume/reconciliation design still needs verified actor/session/receipt semantics; no historical payload, media or command was rebound in this checkpoint.

These results do not certify the entire three-role workflow, full offline recovery or all native map/navigation paths.
