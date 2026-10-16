# C04 — Assigned Crew NORMAL repair bootstrap

## Decision and evidence

Choice **B — EXISTING_CONTRACT_INCOMPLETE**. Owner-authorized task HHWS-BE-API-TEST-C04; base `f2c5f1adcbe610380533246f2082c0858ae079e5`. Current implementation is this change set; use Git history for its delivery SHA. This is an additive read projection, not a new route, role grant, schema migration or approval policy.

API-141/148 intentionally restrict repair item/history reads to PM/Supervisor (`RepairWorkflowRepository.ReadItemAsync` / `GuardAsync`). Their Crew 403 is correct. C03's PM-assisted version handoff was unsuitable for an independent Mobile client. Existing task list/detail exposed task concurrency, not repair item concurrency. Project work-package contains geometry/warranty/project version; survey work-package contains survey task/version; neither provides repair item version. Legacy `/me/inspection-tasks` is not a repair bootstrap contract.

## Source references

- [Task controller](../../../../RoadGuardSystem.API/Controllers/FieldInspectionWorkflowController.cs), `Get`.
- [Task repository](../../../../RoadGuardSystem.Repositories/Implementations/Inspections/FieldInspectionWorkflowRepository.cs), `GuardAsync`, `ReadAsync`, `ViewAsync`, serializable read transaction.
- [Assigned Crew projection](../../../../RoadGuardSystem.Repositories/Implementations/Inspections/FieldInspectionWorkflowRepository.CrewRepairContext.cs), `CrewRepairContextAsync`.
- [Persistence facts](../../../../RoadGuardSystem.BusinessObjects/PersistenceFacts/InspectionsFacts.cs), `FieldTaskViewFact`, `CrewRepairContextFact`.
- [Compatibility DTO](../../../../RoadGuardSystem.DTOs/Inspections/FieldInspectionWorkflowDtos.cs), `FieldTaskView`, `CrewRepairContext`, both implicit conversions.
- [Repair command authority](../../../../RoadGuardSystem.Repositories/Implementations/Repairs/RepairWorkflowRepository.Execution.cs), `GuardExecutionResource`.
- [SQL regressions](../../../../tests/RoadGuardSystem.IntegrationTests/Repairs/H4RepairExecutionSqlTests.CrewBootstrap.cs), five `CrewBootstrap*` tests.
- [Swagger regression](../../../../tests/RoadGuardSystem.ApiTests/Authentication/ManualSwaggerContractTests.cs), `CrewTaskBootstrapDocumentsSeparateItemVersionWithoutChangingTaskVersion`.

## FE contract

Crew uses Mobile React Native Expo, bearer authentication and existing project scope. Discover assigned task IDs via API-078 `GET /api/v1/projects/{projectId}/field-inspection-tasks`, then API-080 `GET /api/v1/projects/{projectId}/field-inspection-tasks/{taskId}`. No Idempotency-Key or If-Match is required for these reads.

API-080 retains all existing fields. It adds nullable `repairContext` only for the currently assigned NORMAL Crew. Outer `projectId`, `id` (task ID), `assignmentId`, `firstStartOriginId`, `requiredMeasurementType`, `measurementScope`, `instructions` and `dueAt` retain their original semantics.

| Nested field | Source / meaning |
|---|---|
| `packageId` | Current item's parent package |
| `itemId` | Task-linked current repair item |
| `bindingId` | Item's current binding, matching task/assignment/Crew |
| `mode` | `NORMAL`; no Fast Track bootstrap added |
| `status` | Exact `RepairItem.State.ToString()`; observed `Confirmed`, not `CONFIRMED` |
| `itemVersion` | Base64 SQL rowversion of **RepairItem**, not task |
| `repairPlan` | Approved item's plan |
| `checklistVersion` | Item's checklist revision |

No invented `allowedActions` or `requiredEvidence` array is added. Read task measurement requirements and the plan/checklist; follow authoritative command admission and existing evidence DTOs. A status does not grant a permission. Null context means the response supplies no NORMAL repair capability: do not infer IDs or borrow PM versions. PM/Supervisor, task list and non-NORMAL projections have no repair context.

### Version and command sequence

Let `R=/api/v1/projects/{projectId}/repair-packages/{packageId}/items/{itemId}` and `T=R/tasks/{taskId}`. The full exact routes remain in the [API catalog](../../04_API-Contracts/02_Full-API-Catalog.md).

| API | Action / actor | Version input |
|---|---|---|
| API-080 | Read current assigned task / Crew | None; response outer version and ETag are task version |
| API-156 `POST T/assessment` | Crew immutable BEFORE assessment | Fresh `repairContext.itemVersion` |
| API-161 `POST T/execution-start` | Crew physical execution-start claim | Fresh itemVersion |
| API-160 `POST T/execution-finish` | Crew finish claim | Fresh itemVersion |
| API-095 `POST /api/v1/projects/{projectId}/field-inspection-tasks/{taskId}/submissions` | FIELD intake or revision / Crew | **Outer task version**, not itemVersion |
| API-157 `POST T/attempts` | Bind immutable FIELD submission / Crew | Fresh itemVersion |
| API-158 `POST T/attempts/reviews` | SUPPLEMENT or ACCEPT / PM | Current PM item version |
| API-159 `POST T/attempts/supplements` | Bind FIELD revision to same repair attempt / Crew | Fresh itemVersion |
| API-147 `POST R/final-confirmation` | NORMAL final / Supervisor | Current item version |

For commands send bearer token, JSON body, stable `Idempotency-Key`, and `If-Match: "<base64-version>"` with quotes. Reread API-080 immediately before each Crew repair command and after another actor's decision. Item changes can leave outer task ETag unchanged; do not rely on task-only cache invalidation. Backend current-authority/concurrency checks remain authoritative after any read.

Bodies are existing DTOs: assessment carries `originId`, `fieldFirstStartId`, measurements, evidence and locationProof; start carries origin/firstStart/assessment/claimedAt; finish carries origin/executionStart/claimedAt; attempt carries `fieldSubmissionId`, `expectedContentHash`, `executionFinishId`; repair supplement carries revision `fieldSubmissionId`/`expectedContentHash`. FIELD revision is a separate submission with `parentSubmissionId`; API-159 is not a generic FIELD supplement. See executable examples in the external C04 Postman handoff.

Upload BEFORE/AFTER actual bytes through multipart upload, preserve object ETag/checksum, complete and poll boundedly for VERIFIED. Complete 202 is not VERIFIED. References use verified `fileId`/`uploadSessionId`, hash, capture time, provenance and coordinates as required by the existing submission DTO. C04 uses synthetic PNG/measurements in an isolated Development environment, not actual physical repair evidence.

### Authorization and recovery

The existing read guard checks current actor, current project membership and active task assignment. The new projection additionally requires current item/binding/obligation/package project and defect agreement, matching active assignment/Crew, NORMAL mode, no superseded item, current obligation item, and active date-valid Crew membership. It returns no unrelated item/history/PM decision data. Legitimate historical FIELD read rights are preserved; no context is returned if repair links are no longer current. Existing commands reauthorize independently.

401: renew/login using existing session policy, never log tokens. 403: stop command and refresh membership/assignment; no PM token fallback. 409 `concurrency_conflict`: reread API-080, reconcile and ask user to retry with new logical action/key only when appropriate. Preserve original key/body/version on unknown outcome replay. 412/428: use existing precondition error handling, never synthesize version; no claim these were executed in C04. Network failures: read state before creating a duplicate operation. API-141/148 and Supervisor/PM decisions remain unavailable to Crew.

## Verification and boundaries

CURRENT_VERIFIED: five new SQL bootstrap regressions; 71 related SQL tests; 966 Unit tests; 16 focused HTTP API tests; real isolated HTTP NORMAL chain through PM supplement/ACCEPT and Supervisor final, with Crew versions exclusively from API-080. Unassigned/wrong-project/revoked/ended/superseded and stale-version denial are covered by SQL regressions. Wrong-project, Reporter, Crew item/history/approval/final and PM final denials are also covered by actual HTTP. SQL fixture authority changes are isolated regression arrangements, never used to bypass the HTTP chain.

Runtime OpenAPI remains 241 operations; additive context schema is generated from source. Historical Phase2C snapshots remain historical; catalog has a scoped amendment. The Swagger source-evidence golden excerpt is updated only for the changed task GET branch, not regenerated indiscriminately. External C04 report/evidence records final Newman and exact-SHA CI results.

NOT_VERIFIED: Expo/native execution, native encrypted storage, production upload verification, deployment, real physical measurement and external AI. No FT/AI GAP is closed by C04. P5-G02 is CLOSED_CANDIDATE only for assigned NORMAL Crew Backend contract, subject to independent review; global MVP/E2E remains unverified.
