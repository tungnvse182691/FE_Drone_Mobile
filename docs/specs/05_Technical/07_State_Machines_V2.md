# V2 logical state machines

**Status:** `TARGET_DOCUMENTED`; names are logical until mapped to current enums/contracts. Current enum/source evidence remains in the code map and must not be renamed by this document.

| Machine | States | Key transitions and authority |
|---|---|---|
| Case/Defect | RECEIVED, TRIAGED, PRELIMINARY, VERIFIED, REPAIR_PENDING, IN_PROGRESS, REVIEW, VERIFIED_AFTER_RETEST, CLOSED, REOPENED | Reporter/PM intake; PM verifies/reopens by D09; acceptance is separate from defect verification. |
| Inspection task | CREATED, ASSIGNED, ACKNOWLEDGED, MEASURE_ONLY, SUBMITTED, EVALUATED, REPAIR_TASK_CREATED | PM assignment; batch cannot self-upgrade to repair; D02 creates a new repair task. |
| Repair attempt | DRAFT, IN_PROGRESS, SUBMITTED, NEEDS_EVIDENCE, REWORK_REQUIRED, ACCEPTED | Crew records; PM reviews; BEFORE/AFTER source and attempt history required. |
| Assignment/handover | ASSIGNED, ACKNOWLEDGED, STOPPED, HANDED_OVER, CONFLICT_INTAKE, RESOLVED | D05 old team stop/handover before new start; D06/42A rescue preserves original actor. |
| Processing job/attempt | QUEUED, PM_TRIGGERED, DISPATCHED, RUNNING, ARTIFACT_VERIFYING, RESULT_READY, STALE, FAILED, CANCELLED | PM trigger D13; attempt fencing/receipt prevents late active overwrite. |
| Curing/release | PHYSICAL_COMPLETE, CURING, RELEASE_CHECK, TRAFFIC_RELEASED, ACCEPTED | Crew/lead checklist, PM coordination, separate acceptance; reminder never releases traffic. |
| Sync operation | LOCAL_PENDING, UPLOADING, RECEIVED, APPLIED, DUPLICATE, CONFLICT, REJECTED | Per-operation ACK after durability; current authority rechecked at reconnect. |

Every transition records actor, timestamp source, policy/task/route/model version, evidence references, expected version and error/receipt. `UNKNOWN` is a data assessment, not a state transition to PASS.
