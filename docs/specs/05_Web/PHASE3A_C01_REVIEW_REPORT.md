# Phase 3A-C01 review report — role and transport correction

**Historical note:** Phase 3A-C02 supersedes the WebAuth classification rows for API-013 through API-017 using direct controller/config source evidence. See [C02 report](PHASE3A_C02_REVIEW_REPORT.md). Remaining C01 rows are retained as audit history.

**Task baseline:** `e79cad9098ecfc3f3921ff60d330f978aa7c29ee`  
**Scope:** documentation and rerunnable validator only; no ASP.NET/API/DTO/OpenAPI/Web/Expo source changed. Independent JEV review remains pending.

## Result

The scan covers **23 screens** and **253 unique Screen–API mappings** from the Phase 3A matrices. Classification is derived from the Phase 2C catalog actor/role and authentication declaration, then checked against the active matrix.

| Classification | Count | Meaning |
|---|---:|---|
| `READY_BY_SOURCE` | 145 | Actor is declared for the screen and catalog declares Web cookie eligibility. This is not Web E2E PASS. |
| `WRONG_ROLE_REMOVED` | 57 | Baseline mapping removed from the active screen command/read contract because catalog actor excludes the screen actor. |
| `TRANSPORT_BLOCKED` | 51 | Actor is allowed by source, but catalog declares Bearer-only/no Web cookie eligibility; Backend follow-up remains open. |
| `SOURCE_UNCERTAIN` | 0 | No mapping met this category; unresolved runtime/deployment matters remain `NOT_VERIFIED_WEB_E2E`. |

Validator active matrix contains 196 mappings after removal; every removed baseline mapping remains listed in the adjudication appendix for auditability.

## Before/after mismatch register

The following is the complete mismatch register, not a sample. Before = baseline Phase 3A mapping; after = classification/action.

| Screen | API | Exact route | Catalog actor | Before | After |
|---|---|---|---|---|---|
| SUP-01 | [API-013](../04_API-Contracts/02_Full-API-Catalog.md#api-013) | `GET /api/v1/auth/web/csrf` | Anonymous/credential | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Anonymous/credential; Supervisor cannot invoke this operation |
| SUP-03 | [API-020](../04_API-Contracts/02_Full-API-Catalog.md#api-020) | `POST /api/v1/cases/{caseId}/conclusions` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-03 | [API-021](../04_API-Contracts/02_Full-API-Catalog.md#api-021) | `POST /api/v1/cases/{caseId}/publications` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-03 | [API-022](../04_API-Contracts/02_Full-API-Catalog.md#api-022) | `POST /api/v1/cases/{caseId}/report-links` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-03 | [API-023](../04_API-Contracts/02_Full-API-Catalog.md#api-023) | `POST /api/v1/cases/{caseId}/report-splits` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-05 | [API-177](../04_API-Contracts/02_Full-API-Catalog.md#api-177) | `POST /api/v1/projects/{projectId}/road-geometry-drafts` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-05 | [API-179](../04_API-Contracts/02_Full-API-Catalog.md#api-179) | `PUT /api/v1/projects/{projectId}/road-geometry-drafts/{draftId}` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-05 | [API-181](../04_API-Contracts/02_Full-API-Catalog.md#api-181) | `POST /api/v1/projects/{projectId}/road-geometry-drafts/{draftId}/preview` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-05 | [API-184](../04_API-Contracts/02_Full-API-Catalog.md#api-184) | `POST /api/v1/projects/{projectId}/road-sections/{roadSectionId}/geometry-drafts` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-05 | [API-196](../04_API-Contracts/02_Full-API-Catalog.md#api-196) | `POST /api/v1/projects/{projectId}/road-sections/{roadSectionId}/versions/{routeVersionId}/segment-sets/{setId}/publish` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-05 | [API-197](../04_API-Contracts/02_Full-API-Catalog.md#api-197) | `POST /api/v1/projects/{projectId}/road-sections/{roadSectionId}/versions/{routeVersionId}/segment-sets/preview` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-05 | [API-101](../04_API-Contracts/02_Full-API-Catalog.md#api-101) | `POST /api/v1/projects/{projectId}/geometry-map-publications` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-06 | [API-061](../04_API-Contracts/02_Full-API-Catalog.md#api-061) | `GET /api/v1/projects/{projectId}/candidates` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-06 | [API-060](../04_API-Contracts/02_Full-API-Catalog.md#api-060) | `GET /api/v1/projects/{projectId}/candidate-decisions/{decisionId}` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-06 | [API-070](../04_API-Contracts/02_Full-API-Catalog.md#api-070) | `GET /api/v1/projects/{projectId}/defects` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-06 | [API-071](../04_API-Contracts/02_Full-API-Catalog.md#api-071) | `GET /api/v1/projects/{projectId}/defects/{defectId}` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-06 | [API-073](../04_API-Contracts/02_Full-API-Catalog.md#api-073) | `POST /api/v1/projects/{projectId}/defects/{defectId}/verification-decisions` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-08 | [API-162](../04_API-Contracts/02_Full-API-Catalog.md#api-162) | `POST /api/v1/projects/{projectId}/repair-policies/drafts` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-08 | [API-163](../04_API-Contracts/02_Full-API-Catalog.md#api-163) | `GET /api/v1/projects/{projectId}/repair-policies/drafts/{draftId}` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-08 | [API-166](../04_API-Contracts/02_Full-API-Catalog.md#api-166) | `GET /api/v1/projects/{projectId}/repair-policies/revisions/{revisionId}` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-08 | [API-165](../04_API-Contracts/02_Full-API-Catalog.md#api-165) | `POST /api/v1/projects/{projectId}/repair-policies/drafts/{draftId}/publish` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-08 | [API-167](../04_API-Contracts/02_Full-API-Catalog.md#api-167) | `POST /api/v1/projects/{projectId}/repair-policies/revisions/{revisionId}/revoke` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| SUP-10 | [API-069](../04_API-Contracts/02_Full-API-Catalog.md#api-069) | `POST /api/v1/projects/{projectId}/defect-statistics` | PM | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is PM; Supervisor cannot invoke this operation |
| PM-01 | [API-013](../04_API-Contracts/02_Full-API-Catalog.md#api-013) | `GET /api/v1/auth/web/csrf` | Anonymous/credential | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Anonymous/credential; PM cannot invoke this operation |
| PM-02 | [API-050](../04_API-Contracts/02_Full-API-Catalog.md#api-050) | `POST /api/v1/projects` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |
| PM-02 | [API-051](../04_API-Contracts/02_Full-API-Catalog.md#api-051) | `PUT /api/v1/projects/{projectId}` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |
| PM-02 | [API-111](../04_API-Contracts/02_Full-API-Catalog.md#api-111) | `POST /api/v1/projects/{projectId}/lifecycle/renewed-handling-scope` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |
| PM-02 | [API-134](../04_API-Contracts/02_Full-API-Catalog.md#api-134) | `PUT /api/v1/projects/{projectId}/primary-project-manager` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |
| PM-03 | [API-180](../04_API-Contracts/02_Full-API-Catalog.md#api-180) | `POST /api/v1/projects/{projectId}/road-geometry-drafts/{draftId}/confirm` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |
| PM-03 | [API-183](../04_API-Contracts/02_Full-API-Catalog.md#api-183) | `POST /api/v1/projects/{projectId}/road-sections` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |
| PM-03 | [API-187](../04_API-Contracts/02_Full-API-Catalog.md#api-187) | `POST /api/v1/projects/{projectId}/road-sections/{roadSectionId}/geometry-drafts/{draftId}/confirm` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |
| PM-03 | [API-191](../04_API-Contracts/02_Full-API-Catalog.md#api-191) | `POST /api/v1/projects/{projectId}/road-sections/{roadSectionId}/versions` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |
| PM-06 | [API-038](../04_API-Contracts/02_Full-API-Catalog.md#api-038) | `GET /api/v1/me/survey-tasks` | Operator | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Operator; PM cannot invoke this operation |
| PM-06 | [API-227](../04_API-Contracts/02_Full-API-Catalog.md#api-227) | `POST /api/v1/survey-tasks/{taskId}/accept` | Operator | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Operator; PM cannot invoke this operation |
| PM-06 | [API-229](../04_API-Contracts/02_Full-API-Catalog.md#api-229) | `POST /api/v1/survey-tasks/{taskId}/datasets` | Operator | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Operator; PM cannot invoke this operation |
| PM-06 | [API-230](../04_API-Contracts/02_Full-API-Catalog.md#api-230) | `POST /api/v1/survey-tasks/{taskId}/decline` | Operator | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Operator; PM cannot invoke this operation |
| PM-08 | [API-081](../04_API-Contracts/02_Full-API-Catalog.md#api-081) | `POST /api/v1/projects/{projectId}/field-inspection-tasks/{taskId}/accept` | Crew | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Crew; PM cannot invoke this operation |
| PM-08 | [API-091](../04_API-Contracts/02_Full-API-Catalog.md#api-091) | `POST /api/v1/projects/{projectId}/field-inspection-tasks/{taskId}/reject` | Crew | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Crew; PM cannot invoke this operation |
| PM-08 | [API-093](../04_API-Contracts/02_Full-API-Catalog.md#api-093) | `POST /api/v1/projects/{projectId}/field-inspection-tasks/{taskId}/start` | Crew | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Crew; PM cannot invoke this operation |
| PM-08 | [API-095](../04_API-Contracts/02_Full-API-Catalog.md#api-095) | `POST /api/v1/projects/{projectId}/field-inspection-tasks/{taskId}/submissions` | Crew | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Crew; PM cannot invoke this operation |
| PM-09 | [API-142](../04_API-Contracts/02_Full-API-Catalog.md#api-142) | `POST /api/v1/projects/{projectId}/repair-packages/{packageId}/items/{itemId}/approve` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |
| PM-09 | [API-153](../04_API-Contracts/02_Full-API-Catalog.md#api-153) | `POST /api/v1/projects/{projectId}/repair-packages/{packageId}/items/{itemId}/safety-measures/{measureId}/checks` | Crew | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Crew; PM cannot invoke this operation |
| PM-09 | [API-154](../04_API-Contracts/02_Full-API-Catalog.md#api-154) | `POST /api/v1/projects/{projectId}/repair-packages/{packageId}/items/{itemId}/safety-measures/{measureId}/installation` | Crew | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Crew; PM cannot invoke this operation |
| PM-09 | [API-155](../04_API-Contracts/02_Full-API-Catalog.md#api-155) | `POST /api/v1/projects/{projectId}/repair-packages/{packageId}/items/{itemId}/safety-measures/{measureId}/warnings/{warningId}/acknowledgement` | Crew | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Crew; PM cannot invoke this operation |
| PM-09 | [API-156](../04_API-Contracts/02_Full-API-Catalog.md#api-156) | `POST /api/v1/projects/{projectId}/repair-packages/{packageId}/items/{itemId}/tasks/{taskId}/assessment` | Crew | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Crew; PM cannot invoke this operation |
| PM-09 | [API-157](../04_API-Contracts/02_Full-API-Catalog.md#api-157) | `POST /api/v1/projects/{projectId}/repair-packages/{packageId}/items/{itemId}/tasks/{taskId}/attempts` | Crew | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Crew; PM cannot invoke this operation |
| PM-09 | [API-159](../04_API-Contracts/02_Full-API-Catalog.md#api-159) | `POST /api/v1/projects/{projectId}/repair-packages/{packageId}/items/{itemId}/tasks/{taskId}/attempts/supplements` | Crew | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Crew; PM cannot invoke this operation |
| PM-09 | [API-160](../04_API-Contracts/02_Full-API-Catalog.md#api-160) | `POST /api/v1/projects/{projectId}/repair-packages/{packageId}/items/{itemId}/tasks/{taskId}/execution-finish` | Crew | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Crew; PM cannot invoke this operation |
| PM-09 | [API-161](../04_API-Contracts/02_Full-API-Catalog.md#api-161) | `POST /api/v1/projects/{projectId}/repair-packages/{packageId}/items/{itemId}/tasks/{taskId}/execution-start` | Crew | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Crew; PM cannot invoke this operation |
| PM-10 | [API-176](../04_API-Contracts/02_Full-API-Catalog.md#api-176) | `POST /api/v1/projects/{projectId}/road-coverage` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |
| PM-12 | [API-174](../04_API-Contracts/02_Full-API-Catalog.md#api-174) | `PUT /api/v1/projects/{projectId}/retention/files/{fileId}/basis` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |
| PM-12 | [API-220](../04_API-Contracts/02_Full-API-Catalog.md#api-220) | `POST /api/v1/retention/holds` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |
| PM-12 | [API-221](../04_API-Contracts/02_Full-API-Catalog.md#api-221) | `GET /api/v1/retention/holds/{id}` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |
| PM-12 | [API-222](../04_API-Contracts/02_Full-API-Catalog.md#api-222) | `POST /api/v1/retention/holds/{id}/release` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |
| PM-13 | [API-119](../04_API-Contracts/02_Full-API-Catalog.md#api-119) | `POST /api/v1/projects/{projectId}/offline/grants` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |
| PM-13 | [API-121](../04_API-Contracts/02_Full-API-Catalog.md#api-121) | `POST /api/v1/projects/{projectId}/offline/grants/{grantId}/revoke` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |
| PM-13 | [API-126](../04_API-Contracts/02_Full-API-Catalog.md#api-126) | `POST /api/v1/projects/{projectId}/offline/packages/prepare` | Supervisor | active matrix reference | **WRONG_ROLE_REMOVED** | catalog actor is Supervisor; PM cannot invoke this operation |

## Remaining Web transport GAPs

These API references are actor-compatible but current source/catalog does not declare Web cookie eligibility. The Web team must not call them with a browser cookie until Backend owner decides whether to add Web cookie/CSRF eligibility or provide a supported server-side Web adapter. Bearer support alone is not treated as Web support.

| Screen | API | Exact route | Actor | Current transport |
|---|---|---|---|---|
| SUP-01 | [API-014](../04_API-Contracts/02_Full-API-Catalog.md#api-014) | `POST /api/v1/auth/web/login` | Supervisor, PM, Operator, Crew, Reporter | Bearer-only |
| SUP-01 | [API-017](../04_API-Contracts/02_Full-API-Catalog.md#api-017) | `GET /api/v1/auth/web/session` | Supervisor, PM, Operator, Crew, Reporter | Bearer-only |
| SUP-01 | [API-016](../04_API-Contracts/02_Full-API-Catalog.md#api-016) | `POST /api/v1/auth/web/renew` | Supervisor, PM, Operator, Crew, Reporter | Bearer-only |
| SUP-01 | [API-015](../04_API-Contracts/02_Full-API-Catalog.md#api-015) | `POST /api/v1/auth/web/logout` | Supervisor, PM, Operator, Crew, Reporter | Bearer-only |
| SUP-04 | [API-050](../04_API-Contracts/02_Full-API-Catalog.md#api-050) | `POST /api/v1/projects` | Supervisor | Bearer-only |
| SUP-04 | [API-051](../04_API-Contracts/02_Full-API-Catalog.md#api-051) | `PUT /api/v1/projects/{projectId}` | Supervisor | Bearer-only |
| SUP-04 | [API-239](../04_API-Contracts/02_Full-API-Catalog.md#api-239) | `PATCH /api/v1/users/{userId}` | Supervisor | Bearer-only |
| SUP-04 | [API-240](../04_API-Contracts/02_Full-API-Catalog.md#api-240) | `POST /api/v1/users/{userId}/password-reset` | Supervisor | Bearer-only |
| SUP-04 | [API-032](../04_API-Contracts/02_Full-API-Catalog.md#api-032) | `POST /api/v1/invitations` | Supervisor | Bearer-only |
| SUP-05 | [API-183](../04_API-Contracts/02_Full-API-Catalog.md#api-183) | `POST /api/v1/projects/{projectId}/road-sections` | Supervisor | Bearer-only |
| SUP-05 | [API-191](../04_API-Contracts/02_Full-API-Catalog.md#api-191) | `POST /api/v1/projects/{projectId}/road-sections/{roadSectionId}/versions` | Supervisor | Bearer-only |
| SUP-10 | [API-171](../04_API-Contracts/02_Full-API-Catalog.md#api-171) | `POST /api/v1/projects/{projectId}/retention/evaluations` | Supervisor, PM | Bearer-only |
| SUP-10 | [API-172](../04_API-Contracts/02_Full-API-Catalog.md#api-172) | `GET /api/v1/projects/{projectId}/retention/evaluations/{id}` | Supervisor, PM | Bearer-only |
| SUP-10 | [API-174](../04_API-Contracts/02_Full-API-Catalog.md#api-174) | `PUT /api/v1/projects/{projectId}/retention/files/{fileId}/basis` | Supervisor | Bearer-only |
| SUP-10 | [API-220](../04_API-Contracts/02_Full-API-Catalog.md#api-220) | `POST /api/v1/retention/holds` | Supervisor | Bearer-only |
| SUP-10 | [API-221](../04_API-Contracts/02_Full-API-Catalog.md#api-221) | `GET /api/v1/retention/holds/{id}` | Supervisor | Bearer-only |
| SUP-10 | [API-173](../04_API-Contracts/02_Full-API-Catalog.md#api-173) | `GET /api/v1/projects/{projectId}/retention/files/{fileId}` | Supervisor, PM | Bearer-only |
| SUP-10 | [API-222](../04_API-Contracts/02_Full-API-Catalog.md#api-222) | `POST /api/v1/retention/holds/{id}/release` | Supervisor | Bearer-only |
| PM-01 | [API-014](../04_API-Contracts/02_Full-API-Catalog.md#api-014) | `POST /api/v1/auth/web/login` | Supervisor, PM, Operator, Crew, Reporter | Bearer-only |
| PM-01 | [API-017](../04_API-Contracts/02_Full-API-Catalog.md#api-017) | `GET /api/v1/auth/web/session` | Supervisor, PM, Operator, Crew, Reporter | Bearer-only |
| PM-01 | [API-016](../04_API-Contracts/02_Full-API-Catalog.md#api-016) | `POST /api/v1/auth/web/renew` | Supervisor, PM, Operator, Crew, Reporter | Bearer-only |
| PM-01 | [API-015](../04_API-Contracts/02_Full-API-Catalog.md#api-015) | `POST /api/v1/auth/web/logout` | Supervisor, PM, Operator, Crew, Reporter | Bearer-only |
| PM-02 | [API-207](../04_API-Contracts/02_Full-API-Catalog.md#api-207) | `GET /api/v1/projects/{projectId}/work-package` | Supervisor, PM, Operator, Crew | Bearer-only |
| PM-06 | [API-223](../04_API-Contracts/02_Full-API-Catalog.md#api-223) | `GET /api/v1/survey-plans/{id}` | Supervisor, PM | Bearer-only |
| PM-06 | [API-225](../04_API-Contracts/02_Full-API-Catalog.md#api-225) | `GET /api/v1/survey-tasks/{id}/work-package` | Supervisor, PM, Operator | Bearer-only |
| PM-06 | [API-226](../04_API-Contracts/02_Full-API-Catalog.md#api-226) | `GET /api/v1/survey-tasks/{taskId}` | Supervisor, PM, Operator | Bearer-only |
| PM-06 | [API-241](../04_API-Contracts/02_Full-API-Catalog.md#api-241) | `GET /api/v1/validation-runs/{runId}` | Supervisor, PM | Bearer-only |
| PM-06 | [API-189](../04_API-Contracts/02_Full-API-Catalog.md#api-189) | `POST /api/v1/projects/{projectId}/road-sections/{roadSectionId}/survey-plans` | PM | Bearer-only |
| PM-06 | [API-190](../04_API-Contracts/02_Full-API-Catalog.md#api-190) | `POST /api/v1/projects/{projectId}/road-sections/{roadSectionId}/survey-requests` | PM | Bearer-only |
| PM-06 | [API-201](../04_API-Contracts/02_Full-API-Catalog.md#api-201) | `POST /api/v1/projects/{projectId}/survey-plans` | PM | Bearer-only |
| PM-06 | [API-202](../04_API-Contracts/02_Full-API-Catalog.md#api-202) | `POST /api/v1/projects/{projectId}/survey-plans/{surveyPlanId}/postpone` | PM | Bearer-only |
| PM-06 | [API-203](../04_API-Contracts/02_Full-API-Catalog.md#api-203) | `POST /api/v1/projects/{projectId}/survey-tasks` | PM | Bearer-only |
| PM-06 | [API-204](../04_API-Contracts/02_Full-API-Catalog.md#api-204) | `POST /api/v1/projects/{projectId}/validation-runs` | PM | Bearer-only |
| PM-06 | [API-228](../04_API-Contracts/02_Full-API-Catalog.md#api-228) | `POST /api/v1/survey-tasks/{taskId}/cancel` | PM | Bearer-only |
| PM-06 | [API-231](../04_API-Contracts/02_Full-API-Catalog.md#api-231) | `POST /api/v1/survey-tasks/{taskId}/reassign` | PM | Bearer-only |
| PM-06 | [API-232](../04_API-Contracts/02_Full-API-Catalog.md#api-232) | `POST /api/v1/survey-tasks/{taskId}/supplements` | PM | Bearer-only |
| PM-06 | [API-025](../04_API-Contracts/02_Full-API-Catalog.md#api-025) | `GET /api/v1/datasets/{datasetId}/coverage` | Supervisor, PM, Operator | Bearer-only |
| PM-06 | [API-026](../04_API-Contracts/02_Full-API-Catalog.md#api-026) | `GET /api/v1/datasets/{id}` | Supervisor, PM, Operator | Bearer-only |
| PM-06 | [API-027](../04_API-Contracts/02_Full-API-Catalog.md#api-027) | `POST /api/v1/datasets/{id}/assessments` | PM | Bearer-only |
| PM-06 | [API-028](../04_API-Contracts/02_Full-API-Catalog.md#api-028) | `GET /api/v1/datasets/{id}/assessments/{assessmentId}` | Supervisor, PM, Operator | Bearer-only |
| PM-07 | [API-045](../04_API-Contracts/02_Full-API-Catalog.md#api-045) | `GET /api/v1/processing-jobs/{jobId}` | Supervisor, PM, Operator | Bearer-only |
| PM-07 | [API-052](../04_API-Contracts/02_Full-API-Catalog.md#api-052) | `GET /api/v1/projects/{projectId}/ai-candidates/{detectionId}` | PM | Bearer-only |
| PM-07 | [API-054](../04_API-Contracts/02_Full-API-Catalog.md#api-054) | `GET /api/v1/projects/{projectId}/ai-mock-runs/{runId}` | Supervisor, PM | Bearer-only |
| PM-07 | [API-055](../04_API-Contracts/02_Full-API-Catalog.md#api-055) | `GET /api/v1/projects/{projectId}/ai-mock-runs/{runId}/result` | Supervisor, PM | Bearer-only |
| PM-07 | [API-044](../04_API-Contracts/02_Full-API-Catalog.md#api-044) | `POST /api/v1/processing-jobs` | Supervisor, PM | Bearer-only |
| PM-07 | [API-046](../04_API-Contracts/02_Full-API-Catalog.md#api-046) | `POST /api/v1/processing-jobs/{jobId}/retry` | Supervisor, PM | Bearer-only |
| PM-07 | [API-053](../04_API-Contracts/02_Full-API-Catalog.md#api-053) | `POST /api/v1/projects/{projectId}/ai-mock-runs` | PM | Bearer-only |
| PM-07 | [API-057](../04_API-Contracts/02_Full-API-Catalog.md#api-057) | `POST /api/v1/projects/{projectId}/baseline-selections` | PM | Bearer-only |
| PM-12 | [API-172](../04_API-Contracts/02_Full-API-Catalog.md#api-172) | `GET /api/v1/projects/{projectId}/retention/evaluations/{id}` | Supervisor, PM | Bearer-only |
| PM-12 | [API-171](../04_API-Contracts/02_Full-API-Catalog.md#api-171) | `POST /api/v1/projects/{projectId}/retention/evaluations` | Supervisor, PM | Bearer-only |
| PM-12 | [API-173](../04_API-Contracts/02_Full-API-Catalog.md#api-173) | `GET /api/v1/projects/{projectId}/retention/files/{fileId}` | Supervisor, PM | Bearer-only |

## Business checks

- NORMAL remains PM proposal → Supervisor approval → PM assignment → Crew execution → PM review → Supervisor final; the matrix does not grant PM approval/final or Supervisor Crew actions.
- Fast Track remains PM final with Supervisor informational boundary; no Supervisor approval was added. P2-06 remains open.
- Geometry edit/draft/preview are PM only where catalog says PM; confirmation and road-section creation are Supervisor-only where catalog says Supervisor.
- Reporter remains Mobile React Native + Expo; no Reporter Web portal was introduced.

## Evidence and checks

- [Phase 2C Full API Catalog](../04_API-Contracts/02_Full-API-Catalog.md): exact method/path, actor/scope, auth scheme, cookie eligibility, DTO, headers and source locator per API.
- [Supervisor matrix](02_Supervisor-Screen-API-Matrix.md) and [PM matrix](03_PM-Screen-API-Matrix.md): active references plus complete C01 adjudication tables.
- [Rerunnable validator](tools/validate_phase3a_c01.py): parses catalog and both matrices; checks 23 screens, IDs, routes, role classification, cookie eligibility, transport GAP reasons and active-matrix role safety.
- Link checker: PASS from repository root, 48 Markdown files / 6,292 local links / 0 errors; external URLs/runtime not checked.
- Backend/Web/HTTP/E2E/SQL/provider tests: **NOT_RUN**.

## Self-review

**PASS for documentation correction and validator scope.** The validator is source-derived rather than a hardcoded list of known mismatches. `READY_BY_SOURCE` is explicitly limited to current catalog role plus cookie eligibility and never claims browser E2E. Independent JEV should review whether each proposed Web screen is product-complete and whether each Bearer-only operation needs a Backend Web transport decision.

**STOP after C01. Phase 3B/3C not started.**
