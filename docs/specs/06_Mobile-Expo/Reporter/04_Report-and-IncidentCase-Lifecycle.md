# Report and IncidentCase lifecycle

## Online Reporter journey

1. Reporter completes OTP and Android bearer login.
2. Reporter creates and waits for private evidence to become `VERIFIED`.
3. API-216 `POST /api/v1/reports` accepts `CreateReporterReportRequestDto` with description and one or more verified owned files. GPS is optional; `UNKNOWN` must not include a location. The server resolves ownership and creates the Report, an unassigned `IncidentCase` and its active report link. Reporter does not send `projectId`, `ownerId`, `defectId`, status or trusted uploader fields.
4. API-215 lists only the current Reporter’s own reports. API-217 returns the own projection with server `version`/ETag, evidence metadata, `routingStatus`, supplements and explicitly published updates.
5. Supervisor triages an unassigned Case using Web workflow. PM later decides Candidate/Defect and repair workflow. Reporter cannot see or mutate those internal resources.
6. API-219 supplements an owned report with a new verified evidence set, a fresh K and the latest strong report `If-Match`. A 412 requires reread/review, not blind overwrite.
7. Published updates are read from the own report projection. API-210 may download a published evidence item using the authorized publication/report/evidence tuple. Publication is not an internal Case conclusion and does not imply repair acceptance.

## DTO and privacy rules

API-215 uses `OwnReportPageDto`; API-217 uses `OwnReportDto`; API-216/219 use the catalog request DTOs. Render fields supplied by the response (`id`, `description`, server `createdAt`, `version`, evidence, `routingStatus`, `publicUpdates`, supplements). Do not derive “Defect approved”, “repaired”, “accepted” or percentage progress from `routingStatus`; `UNASSIGNED/ASSIGNED` only describes routing.

API-218 private report evidence download, API-209 private file content and API-210 publication content must use authenticated requests. Never call internal `/cases`, candidate, defect, survey or repair routes with a Reporter token. A missing report must not reveal whether another owner has it.

## Boundaries and gaps

Reporter intake is independent of Drone Survey. PM/Supervisor/Crew authority remains unchanged. Reporter online MVP is not device enrollment, signed batch sync, snapshot handover or physical measurement. There is no source-verified dedicated “request supplement from Reporter” command; the app may let the Reporter append a supplement through API-219. Push/FCM delivery is also not proven; polling own reports is the source-backed read path.

**Evidence:** `ReportsController`, `ReporterLifecycleRepository`, `ReporterEvidenceController`, `CandidateDecisionService`, `CasesController`, `Defect.CreateFromReport`; [API-018](../../04_API-Contracts/02_Full-API-Catalog.md#api-018), [API-019](../../04_API-Contracts/02_Full-API-Catalog.md#api-019), [API-021](../../04_API-Contracts/02_Full-API-Catalog.md#api-021), [API-215–219](../../04_API-Contracts/02_Full-API-Catalog.md#api-215). PM triage/Defect and downstream repair are source boundaries, not Mobile acceptance.
