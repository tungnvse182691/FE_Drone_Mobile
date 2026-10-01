# RoadGuard V2 domain model

**Status:** `TARGET_DOCUMENTED`; current runtime facts are marked `CURRENT_VERIFIED`; proposed concepts are not code.

## Aggregate boundaries

| Aggregate | Root and current evidence | Target responsibilities | Status |
|---|---|---|---|
| Identity/access | `ApplicationUser`, session/token entities | Role/membership/current authorization, web session vs Android token compatibility | `CURRENT_VERIFIED` + D25/36A delta |
| Project/route | `Project`, `RoadSection`, `RoadSectionVersion`, `ProjectMember` | Immutable route/version, segment sets/branches/slabs and destination provenance | `CURRENT_VERIFIED` + target extension |
| Warranty/handover | `Warranty`, `HandoverDocument` | Multiple warranty phases, accepted handover and responsibility basis | `CURRENT_VERIFIED`; handover acknowledgement target extension |
| Report/case/defect | Defect current; Report/Case target | Keep report source/ownership, case orchestration, defect observations and verified-before-repair state | `PROPOSED_DELTA` |
| Survey/dataset | `Survey`, `Flight`, `SurveyFile`, `SurveyDataVersion`, `QualityCheck` | Dataset version, aircraft/quality/coverage separation, supplementary requests | `CURRENT_VERIFIED` + D15/D20 target extension |
| Inspection/policy | `FieldInspectionTask`, `FieldInspectionAssignment`, `FieldInspectionSession`, `GroundTruthMeasurement` | Company framework -> method/profile -> project config -> task/attempt snapshot; offline evaluator | `PARTIAL` |
| Repair/evidence | Target `RepairItem`, `RepairAttempt`, `Evidence` | BEFORE durability, attempts/rework, curing, traffic release and acceptance separation | `PROPOSED_DELTA` |
| Processing/AI | `ProcessingBlock`, `ProcessingJob`, `ProcessingAttempt`, `AIModelVersion`, `AIDetection` | PM trigger, manifest/artifact/receipt, candidate snapshot, PM review | `PARTIAL` |
| Durability/operations | `IdempotencyRecord`, `ConsumerEffectReceipt`, `OutboxMessage`, `AuditLog`, `StoredFile` | Sync phase receipts, conflict/rescue, retention/legal hold | `PARTIAL` |

## Domain transitions

### Case and defect

`REPORT_RECEIVED -> TRIAGED -> DEFECT_PRELIMINARY -> DEFECT_VERIFIED -> REPAIR_PENDING -> REPAIR_IN_PROGRESS -> REPAIR_REVIEW -> CASE_VERIFIED/CLOSED`.

This is a logical transition map, not an enum assertion. AI may create a candidate/preliminary observation; only authorized PM/inspection evidence can verify a defect. A failed repair creates another attempt/rework; a recurrence after valid acceptance is a linked new case/defect history, not silent reset.

### Inspection and Fast Track

`TASK_CREATED -> ASSIGNED -> MEASURE_ONLY -> SUBMITTED -> EVALUATED -> REPAIR_TASK_CREATED -> REPAIR_AUTHORIZED -> REPAIR_STARTED -> REPAIR_SUBMITTED -> PM_REVIEW -> ACCEPTED/REWORK_REQUIRED`.

The `REPAIR_TASK_CREATED` edge is the D02 rule: it is a new authorization after batch measurement, never a mode mutation of the original batch task. D03/Q03 policy framework/profile and technical thresholds gate eligibility.

### Processing and AI

`DATASET_READY -> PM_TRIGGERED -> MANIFEST_FROZEN -> DISPATCHED -> VIDEO_ANALYSIS -> ARTIFACT_VERIFIED -> DUPLICATE_MATCHING -> PM_REVIEW -> LINK_EXISTING/CREATE_NEW/MARK_RECURRENCE/DEFER/REJECT`.

Upload completion alone does not trigger analysis. Old attempts can produce receipts but cannot promote an active result after fencing.

### Assignment/handover/rescue

`ASSIGNED -> ACKNOWLEDGED -> START_ALLOWED`; reassignment requires old scope stopped/handed over before new start. Offline late evidence enters `CONFLICT_INTAKE`, preserving original actor/source; D06/42A rescue grants receipt-scoped authority and does not rewrite ownership.

### Curing and traffic release

`PHYSICAL_COMPLETE -> CURING -> RELEASE_CHECK -> TRAFFIC_RELEASED -> ACCEPTED`.

These are separate logical records. A reminder or upload never opens traffic and `PHYSICAL_COMPLETE` never implies acceptance.

## Invariants

- Every transition has actor, scope, evidence, source snapshot and resulting error/receipt semantics.
- `UNKNOWN` means insufficient basis; it is not PASS, zero or a default measurement.
- Version changes are append-only for used route, policy, model, manifest, candidate snapshot and repair attempt.
- A target state/transition must map to a contract and task before runtime implementation; this document does not add an enum or migration.
