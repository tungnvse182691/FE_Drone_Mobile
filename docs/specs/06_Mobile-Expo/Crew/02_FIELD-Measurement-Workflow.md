# FIELD measurement workflow

FIELD is a formal inspection and provenance workflow, not a repair approval. PM creates/assigns through API-079/082; Crew operates an assigned task through API-080/081/091/093/095/096. Supervisor and PM read scoped evidence with API-085/086/088/094.

## Flow

1. Load task detail, geometry, history and start-origin. Confirm current Crew assignment, Defect/source chain, route/version pins and task version.
2. Accept or reject with API-081/091. Rejection preserves history; it does not reassign itself.
3. Start with API-093. The original/first-start origin is server-owned and must not be reset by a supplement or clock change.
4. Measure the physical defect in the field. Record dimensions and method as the request DTO requires. AI bbox/confidence/frame/timestamp is evidence context only and cannot populate physical dimensions.
5. Capture evidence for the FIELD submission using API-233/236/235 and poll API-234 to `VERIFIED`. Attach verified, task-scoped evidence through API-095 (`FieldSubmissionInput`); purpose and measurement validation remain server authority.
6. PM reviews through API-092. When the FIELD task is `SupplementRequired`, Crew resubmits through API-095 with `ParentSubmissionId` equal to the latest submission, a new K and current task version. Read the submission through API-096. Preserve the first-start origin.
7. FIELD review does not finish a repair. Repair assessment/attempt/supplement/finish (API-156/157/159/160) belong to the separate [repair workflow](03_NORMAL-and-FastTrack-Execution.md), with its own item, assignment and version guards.

## Failure boundaries

Inactive membership, wrong assignment, stale task/item version, unverified file, wrong checksum, missing Defect/source, revoked policy or missing road coverage must fail closed. Preserve original actor, task, source file IDs, snapshot/version and receipt. No last-write-wins and no client-side state transition.

`CURRENT_IMPLEMENTED_BE`: controllers/services/repositories and DTOs documented in workflows 06/07. `PROPOSED_EXPO_UI`: camera/location/file capture and form UX. `NOT_VERIFIED_EXPO_E2E`: native sensors, background capture, actual physical measurement accuracy and device build.
