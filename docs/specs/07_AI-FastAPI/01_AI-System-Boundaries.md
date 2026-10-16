# AI system boundaries

## Responsibilities

| Boundary | Owner | Evidence/status |
|---|---|---|
| Project, survey, dataset, file identity, road geometry and access | ASP.NET Backend | `CURRENT_IMPLEMENTED_BE`; `ProcessingV2Controller.cs`, Phase 2C API-044/045/046 |
| Job/attempt, manifest hash, model/config pins and callback admission | ASP.NET Backend | `CURRENT_IMPLEMENTED_BE`; `ProcessingV2Service.cs`, `ProcessingV2PersistenceService.cs` |
| Frame extraction, SRT parsing, inference and candidate formatting | AI service | `CURRENT_IMPLEMENTED_AI` for repository source; deployment is `NOT_VERIFIED_E2E` |
| PM KEEP_NEW/LINK_EXISTING/REJECT and Defect creation | Backend/PM | `TARGET_CONFIRMED`; AI output is only a candidate |
| FIELD physical dimensions and repair execution | Crew/Backend workflow | `TARGET_CONFIRMED`; bbox is not a physical measurement |

`src/api/worker_service.py` exposes an async job API, but its non-empty-video branch currently instantiates `MockAIAdapter`; this is source evidence of a synthetic path, not proof of real YOLO execution. `src/api/ui_server.py` is a local web test bench and is not the Backend production integration.

No SfM, orthomosaic, DSM, 3D reconstruction or AI-derived physical measurement is part of this handoff. Image road-surface segmentation may be placed where the approved deployment architecture chooses; it is not GIS segmentation.

## Open findings

- **P1-01 PARTIAL:** real FastAPI/provider/checkpoint/capability adoption is unverified.
- **P1-02 PARTIAL:** callback verifies job membership and pins, but latest/active attempt fencing is incomplete.
- **P1-05 NOT_VERIFIED:** external/native/deployment integration was not executed.
