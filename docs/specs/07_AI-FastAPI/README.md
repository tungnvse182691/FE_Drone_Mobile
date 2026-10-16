# FastAPI/YOLO integration handoff

Phase 4 documentation for the internal AI boundary of HoangHaiWarrantySystem. Backend source is pinned at `36c3a1d273f17dd29b816136ae0182a821fd79e4`; AI repository source is read-only snapshot `5d44980a1177abd219cf488c84c365d01cea49e8`.

Status labels: `CURRENT_IMPLEMENTED_BE` means source verified in ASP.NET; `CURRENT_IMPLEMENTED_AI` means source verified in the AI repository; `PROPOSED_INTEGRATION` is a design handoff; `NOT_VERIFIED_E2E` means no deployed/provider test was run; `SOURCE_GAP` means the source does not yet prove the behavior.

The Backend remains the system of record for projects, survey inputs, files, jobs, attempts, provenance, authorization and PM decisions. AI produces detection candidates. It does not create Defects, approve repair, or replace Crew FIELD measurement. GIS road segments/sections are distinct from image/pixel segmentation.

Read in order: [boundaries](01_AI-System-Boundaries.md), [pipeline](02_Video-SRT-and-Frame-Pipeline.md), [BE contract](03_BE-to-AI-Integration-Contract.md), [callback](04_AI-to-BE-Callback-and-Results.md), [schemas](05_Model-Version-and-Detection-Schemas.md), [security](06_Security-Idempotency-and-Retry.md), [acceptance](07_AI-Acceptance-and-Evaluation.md).
