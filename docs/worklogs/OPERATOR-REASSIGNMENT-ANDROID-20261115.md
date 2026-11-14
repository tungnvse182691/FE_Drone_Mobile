# Operator reassignment and empty-journal notice

- Codex IMPLEMENT_AND_SELF_REVIEW, FE base 60baa99, main.
- BE origin/develop pinned 85879fe9082774cf5098a9ba281f56b9c651f8ea.
- Environment: roadguard-crew-sandbox-api:crew-85879fe, localhost18181;
  Pixel 6 Pro emulator-5554 Android14, Expo Go / Metro8090, Operator A.
- Scope: DroneTaskCommandPanel collapsed notice, regression, this evidence.

## HTTP and Android evidence

Dedicated fixture QA-OP-NEW-05, task 9cb55c3f-184c-4483-a6da-a97464645367:
PM API-231 reassign to Operator A succeeded. Android refreshed to Được giao lại,
prepared accept, explicitly dispatched the durable saved command, and showed
Đã nhận. Independent API-226 GET confirms ACCEPTED.

Initial attempt to reassign to B returned 404 identity_user_not_found. Current
repository checks active Operator AND project membership. Eligible members GET
confirmed B eligible but not a member. Added B through existing PM member API,
POST projects/{projectId}/members, 201; member-list GET confirmed membership.
No BE source/SQL edits. This was missing sandbox membership, not a missing API.

Dedicated fixture QA-OP-NEW-06, task c35a0c8c-2a7d-4c77-ade9-a0b9eedbd6ac:
PM reassigned A→B. Independent GET: A403 access_forbidden, B200 REASSIGNED.
Android A refreshed and removed task details, showing the access error.
PM reassigned B→A. GET: A200 REASSIGNED, B403 access_forbidden. Android Tải lại
restored Được giao lại and acceptance controls. No app reset, pending deletion,
automatic replay or fabricated acceptance.

Commands were journaled before POST with environment, actor, immutable body,
Idempotency-Key and actual task If-Match. Member-add endpoint requires no
If-Match. Local journals/readbacks:

- .cache/operator-reassignment-20261115-journal.json
- .cache/operator-membership-qa-20261115-journal.json
- .cache/operator-reassignment-authority-20261115-journal.json

## Reproduced UI bug and fix

On revoked assignment, an empty, successfully read local journal still displayed
Xem lệnh cần đối soát because current task GET failed. Screenshot and hierarchy
confirmed this false notice. The collapsed recovery card now requires a real
unresolved command or an unreadable journal. Task authority failures remain
visible in task detail; expanded controls still fail closed. Real PREPARED,
UNKNOWN_OUTCOME and storage-failure recovery remain covered.

ANDROID_E2E_VERIFIED: after Fast Refresh on the actual revoked task, the false
notice disappears; access error, Tải lại and expandable local history remain.
Native restored assignment was then verified as above.

## Verification

LOGIC_TESTED: node --test tests/operator-ui03.test.cjs, red 22/23 with the
new empty-journal/403 case, green 23/23 after fix. Full regression and compiler
results: npm run typecheck exit 0; node --test tests/*.test.cjs: 1663/1663,
0 fail, 145514.65 ms, .cache/operator-reassignment-regression-20261115.log.
git diff --check exit 0. No new BE gap identified by this
reassignment scenario. The supplement parent/child readback gap from the prior
checkpoint remains a separate issue.
