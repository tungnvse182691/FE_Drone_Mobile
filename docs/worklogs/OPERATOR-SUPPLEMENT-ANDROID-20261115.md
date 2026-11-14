# Operator supplement — Android and HTTP, 2026-11-15

Mode: IMPLEMENT_AND_SELF_REVIEW. FE base 15aa811, BE origin/develop
85879fe9082774cf5098a9ba281f56b9c651f8ea. Sandbox API image
roadguard-crew-sandbox-api:crew-85879fe, localhost:18181. No BE source edits.

## Changes

- Move acceptance out of the technical card to directly below the task status
  for NEW_ASSIGNED/REASSIGNED. Keep completed history collapsed in the technical
  section and retain unresolved-command recovery.
- Explain SUPPLEMENT_REQUIRED with an assigned-task-list action. Follow
  supplementTaskId only when supplied by BE; never infer the relationship.
- UI grouping reference: Android Material containment guidance,
  https://developer.android.com/design/ui/mobile/guides/components/material-overview.

## Executed evidence

HTTP_VERIFIED (mutation, dedicated QA): PM API-232 POST supplements on parent
031e423d-20e7-4c35-a814-582e3a8751e9 returned child
4a230453-2292-44fd-9f53-6e18b57c8a89. Durable journal retained in local .cache.
Operator API-226 and API-225 GET child returned 200 with NEW_ASSIGNED and one
geometry reference. ANDROID_E2E_VERIFIED: prepare accept, explicitly send saved
command, return to detail displaying Đã nhận. Independent GET child returned 200,
ACCEPTED, version AAAAAAACFDM=.

ANDROID_E2E_VERIFIED: original task shows Cần bổ sung and short supplement card;
tap Xem nhiệm vụ được giao opens assigned tasks. Native work package displays
two pinned segments; full-screen MapLibre, segment selection, point-of-access
focus, and map pan were exercised. Upload screen opens for the accepted child,
shows the real eligible aircraft and empty video/telemetry selectors. This
checkpoint does not claim a dataset submission for this child.

Map investigation via read-only WebView CDP: source segment is near
[105,9.951046], access point [106.56,10.76]. Fitting both makes the view too wide.
This is a legacy QA fixture spatial mismatch; do not infer a new BE WGS84 gap.
Selected-segment framing needs a separate FE checkpoint.

LOGIC_TESTED: node --test tests/operator-detail-focus.test.cjs, 13/13 after a
failing supplement-navigation test. npm run typecheck exit 0. Full regression:
node --test tests/*.test.cjs, 1661/1661, 0 fail, 155065.0209 ms; local log
.cache/operator-supplement-regression-final-20261115.log. git diff --check clean.

## BE_DISCOVERY_GAP — supplement readback relationship

POST API-232 returns supplementTaskId. GET API-226 on the same parent returns
SUPPLEMENT_REQUIRED with supplementTaskId null. Child/list DTO does not provide
parentTaskId or the PM supplement reason. Source:
RoadGuardSystem.Repositories/Implementations/Surveys/SurveyV2PersistenceService.cs
at pinned BE: command view adds SupplementTaskId at line 339, while ToTaskView
(lines 439 onward) used by reads does not reconstruct the child link.

Request BE to persistently expose the authorized parent/child relation in
API-226/list readback (and the PM reason if required for Operator). FE cannot
reliably deep-link to the correct supplement after reload without that source.
The assigned child itself is usable and was accepted on Android.
