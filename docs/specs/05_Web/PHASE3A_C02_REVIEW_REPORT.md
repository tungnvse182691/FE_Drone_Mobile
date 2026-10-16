# Phase 3A-C02 review report — WebAuth transport correction

**Baseline:** `b20d455f0e24a101987fc462337885a4dfc0f2d9`  
**Scope:** documentation and validator only. No Backend/API/OpenAPI/Web/Expo source changed. Independent JEV review pending.

## Classification result

The complete matrix scan remains **23 screens / 253 unique Screen–API mappings**. C02 reclassified WebAuth from direct source evidence and re-ran the C01 validator.

| Classification | Mapping count | Unique API count | Meaning |
|---|---:|---:|---|
| `ANONYMOUS_BOOTSTRAP` | 6 | 3 | API-013/014/016; `[AllowAnonymous]`, CSRF/renewal-cookie bootstrap, no logged-in actor required. |
| `WEB_COOKIE_EXPLICIT` | 4 | 2 | API-015/017; explicit `Authorize(AuthenticationSchemes = WebCookieConfiguration.Scheme)`. Active status is `READY_BY_SOURCE`. |
| `WEB_COOKIE_SELECTOR` | 145 | source-derived | Actor-compatible active mappings whose catalog metadata/source selector permits Web cookie. |
| `READY_BY_SOURCE` total | 149 | — | 145 selector + 4 explicit; role and Web transport both valid. |
| `WRONG_ROLE_REMOVED` | 55 | — | Still removed from active matrices; C02 adds back only anonymous bootstrap references with source proof. |
| `TRANSPORT_BLOCKED` / actual Bearer-only | 43 | 40 | Actor-compatible mappings where selector source does not admit the route and no explicit Web cookie scheme exists. |
| `SOURCE_UNCERTAIN` | 0 | 0 | No mapping was promoted without source evidence. |

The four endpoints previously counted among 51 transport blocks are not Backend gaps. The remaining actual Bearer-only set is **43 mappings across 40 unique API endpoints**.

## Before / after changed APIs

| API | Exact route | C01 classification | C02 source classification | Evidence |
|---|---|---|---|---|
| [API-013](../04_API-Contracts/02_Full-API-Catalog.md#api-013) | `GET /api/v1/auth/web/csrf` | `WRONG_ROLE_REMOVED` | `ANONYMOUS_BOOTSTRAP` | `WebAuthController.Csrf` `[AllowAnonymous]`, source L26; `GetAndStoreTokens`; no actor required. |
| [API-014](../04_API-Contracts/02_Full-API-Catalog.md#api-014) | `POST /api/v1/auth/web/login` | `TRANSPORT_BLOCKED` | `ANONYMOUS_BOOTSTRAP` | `WebAuthController.Login` `[AllowAnonymous]`, source L37; CSRF validated then `SignInAsync(RoadGuardWeb)`. |
| [API-015](../04_API-Contracts/02_Full-API-Catalog.md#api-015) | `POST /api/v1/auth/web/logout` | `TRANSPORT_BLOCKED` | `WEB_COOKIE_EXPLICIT` → `READY_BY_SOURCE` | Explicit WebCookie authorize at source L118; CSRF + idempotency. |
| [API-016](../04_API-Contracts/02_Full-API-Catalog.md#api-016) | `POST /api/v1/auth/web/renew` | `TRANSPORT_BLOCKED` | `ANONYMOUS_BOOTSTRAP` | `WebAuthController.Renew` `[AllowAnonymous]`, source L61; renewal cookie + CSRF; no bearer Authorization accepted. |
| [API-017](../04_API-Contracts/02_Full-API-Catalog.md#api-017) | `GET /api/v1/auth/web/session` | `TRANSPORT_BLOCKED` | `WEB_COOKIE_EXPLICIT` → `READY_BY_SOURCE` | Explicit WebCookie authorize at source L106; `TryClaims`/session validation. |

## Remaining Backend transport GAPs

The following are the complete 43 actor-compatible mappings still blocked for browser-cookie Web use. This report does not grant cookie eligibility. Backend owner must either add an explicit WebCookie/selector path with CSRF admission or provide an approved Web adapter; Bearer support alone is insufficient.

| Screen | API | Exact route | Catalog actor | Current evidence |
|---|---|---|---|---|
| SUP-04 | [API-050](../04_API-Contracts/02_Full-API-Catalog.md#api-050) | `POST /api/v1/projects` | Supervisor | WebCookie selector source has no matching branch; catalog says Bearer-only |
| SUP-04 | [API-051](../04_API-Contracts/02_Full-API-Catalog.md#api-051) | `PUT /api/v1/projects/{projectId}` | Supervisor | WebCookie selector source has no matching branch; catalog says Bearer-only |
| SUP-04 | [API-239](../04_API-Contracts/02_Full-API-Catalog.md#api-239) | `PATCH /api/v1/users/{userId}` | Supervisor | WebCookie selector source has no matching branch; catalog says Bearer-only |
| SUP-04 | [API-240](../04_API-Contracts/02_Full-API-Catalog.md#api-240) | `POST /api/v1/users/{userId}/password-reset` | Supervisor | WebCookie selector source has no matching branch; catalog says Bearer-only |
| SUP-04 | [API-032](../04_API-Contracts/02_Full-API-Catalog.md#api-032) | `POST /api/v1/invitations` | Supervisor | WebCookie selector source has no matching branch; catalog says Bearer-only |
| SUP-05 | [API-183](../04_API-Contracts/02_Full-API-Catalog.md#api-183) | `POST /api/v1/projects/{projectId}/road-sections` | Supervisor | WebCookie selector source has no matching branch; catalog says Bearer-only |
| SUP-05 | [API-191](../04_API-Contracts/02_Full-API-Catalog.md#api-191) | `POST /api/v1/projects/{projectId}/road-sections/{roadSectionId}/versions` | Supervisor | WebCookie selector source has no matching branch; catalog says Bearer-only |
| SUP-10 | [API-171](../04_API-Contracts/02_Full-API-Catalog.md#api-171) | `POST /api/v1/projects/{projectId}/retention/evaluations` | Supervisor, PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| SUP-10 | [API-172](../04_API-Contracts/02_Full-API-Catalog.md#api-172) | `GET /api/v1/projects/{projectId}/retention/evaluations/{id}` | Supervisor, PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| SUP-10 | [API-174](../04_API-Contracts/02_Full-API-Catalog.md#api-174) | `PUT /api/v1/projects/{projectId}/retention/files/{fileId}/basis` | Supervisor | WebCookie selector source has no matching branch; catalog says Bearer-only |
| SUP-10 | [API-220](../04_API-Contracts/02_Full-API-Catalog.md#api-220) | `POST /api/v1/retention/holds` | Supervisor | WebCookie selector source has no matching branch; catalog says Bearer-only |
| SUP-10 | [API-221](../04_API-Contracts/02_Full-API-Catalog.md#api-221) | `GET /api/v1/retention/holds/{id}` | Supervisor | WebCookie selector source has no matching branch; catalog says Bearer-only |
| SUP-10 | [API-173](../04_API-Contracts/02_Full-API-Catalog.md#api-173) | `GET /api/v1/projects/{projectId}/retention/files/{fileId}` | Supervisor, PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| SUP-10 | [API-222](../04_API-Contracts/02_Full-API-Catalog.md#api-222) | `POST /api/v1/retention/holds/{id}/release` | Supervisor | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-02 | [API-207](../04_API-Contracts/02_Full-API-Catalog.md#api-207) | `GET /api/v1/projects/{projectId}/work-package` | Supervisor, PM, Operator, Crew | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-223](../04_API-Contracts/02_Full-API-Catalog.md#api-223) | `GET /api/v1/survey-plans/{id}` | Supervisor, PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-225](../04_API-Contracts/02_Full-API-Catalog.md#api-225) | `GET /api/v1/survey-tasks/{id}/work-package` | Supervisor, PM, Operator | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-226](../04_API-Contracts/02_Full-API-Catalog.md#api-226) | `GET /api/v1/survey-tasks/{taskId}` | Supervisor, PM, Operator | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-241](../04_API-Contracts/02_Full-API-Catalog.md#api-241) | `GET /api/v1/validation-runs/{runId}` | Supervisor, PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-189](../04_API-Contracts/02_Full-API-Catalog.md#api-189) | `POST /api/v1/projects/{projectId}/road-sections/{roadSectionId}/survey-plans` | PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-190](../04_API-Contracts/02_Full-API-Catalog.md#api-190) | `POST /api/v1/projects/{projectId}/road-sections/{roadSectionId}/survey-requests` | PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-201](../04_API-Contracts/02_Full-API-Catalog.md#api-201) | `POST /api/v1/projects/{projectId}/survey-plans` | PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-202](../04_API-Contracts/02_Full-API-Catalog.md#api-202) | `POST /api/v1/projects/{projectId}/survey-plans/{surveyPlanId}/postpone` | PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-203](../04_API-Contracts/02_Full-API-Catalog.md#api-203) | `POST /api/v1/projects/{projectId}/survey-tasks` | PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-204](../04_API-Contracts/02_Full-API-Catalog.md#api-204) | `POST /api/v1/projects/{projectId}/validation-runs` | PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-228](../04_API-Contracts/02_Full-API-Catalog.md#api-228) | `POST /api/v1/survey-tasks/{taskId}/cancel` | PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-231](../04_API-Contracts/02_Full-API-Catalog.md#api-231) | `POST /api/v1/survey-tasks/{taskId}/reassign` | PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-232](../04_API-Contracts/02_Full-API-Catalog.md#api-232) | `POST /api/v1/survey-tasks/{taskId}/supplements` | PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-025](../04_API-Contracts/02_Full-API-Catalog.md#api-025) | `GET /api/v1/datasets/{datasetId}/coverage` | Supervisor, PM, Operator | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-026](../04_API-Contracts/02_Full-API-Catalog.md#api-026) | `GET /api/v1/datasets/{id}` | Supervisor, PM, Operator | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-027](../04_API-Contracts/02_Full-API-Catalog.md#api-027) | `POST /api/v1/datasets/{id}/assessments` | PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-06 | [API-028](../04_API-Contracts/02_Full-API-Catalog.md#api-028) | `GET /api/v1/datasets/{id}/assessments/{assessmentId}` | Supervisor, PM, Operator | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-07 | [API-045](../04_API-Contracts/02_Full-API-Catalog.md#api-045) | `GET /api/v1/processing-jobs/{jobId}` | Supervisor, PM, Operator | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-07 | [API-052](../04_API-Contracts/02_Full-API-Catalog.md#api-052) | `GET /api/v1/projects/{projectId}/ai-candidates/{detectionId}` | PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-07 | [API-054](../04_API-Contracts/02_Full-API-Catalog.md#api-054) | `GET /api/v1/projects/{projectId}/ai-mock-runs/{runId}` | Supervisor, PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-07 | [API-055](../04_API-Contracts/02_Full-API-Catalog.md#api-055) | `GET /api/v1/projects/{projectId}/ai-mock-runs/{runId}/result` | Supervisor, PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-07 | [API-044](../04_API-Contracts/02_Full-API-Catalog.md#api-044) | `POST /api/v1/processing-jobs` | Supervisor, PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-07 | [API-046](../04_API-Contracts/02_Full-API-Catalog.md#api-046) | `POST /api/v1/processing-jobs/{jobId}/retry` | Supervisor, PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-07 | [API-053](../04_API-Contracts/02_Full-API-Catalog.md#api-053) | `POST /api/v1/projects/{projectId}/ai-mock-runs` | PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-07 | [API-057](../04_API-Contracts/02_Full-API-Catalog.md#api-057) | `POST /api/v1/projects/{projectId}/baseline-selections` | PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-12 | [API-172](../04_API-Contracts/02_Full-API-Catalog.md#api-172) | `GET /api/v1/projects/{projectId}/retention/evaluations/{id}` | Supervisor, PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-12 | [API-171](../04_API-Contracts/02_Full-API-Catalog.md#api-171) | `POST /api/v1/projects/{projectId}/retention/evaluations` | Supervisor, PM | WebCookie selector source has no matching branch; catalog says Bearer-only |
| PM-12 | [API-173](../04_API-Contracts/02_Full-API-Catalog.md#api-173) | `GET /api/v1/projects/{projectId}/retention/files/{fileId}` | Supervisor, PM | WebCookie selector source has no matching branch; catalog says Bearer-only |

## Validator and regression evidence

The rerunnable [C01 validator](tools/validate_phase3a_c01.py) now reads `WebAuthController.cs` and `WebCookieConfiguration.cs`. It distinguishes `[AllowAnonymous]` bootstrap, explicit `RoadGuardWeb`, metadata/legacy selector and Bearer-only routes; it checks route equality, active role safety and catalog/source contradiction. Regression assertions cover API-013/014/016 bootstrap, API-015/017 explicit cookie and API-050 as a Bearer-only control.

Validator output:

```text
{"screens": 23, "mappings": 253, "valid": 149, "anonymous_bootstrap": 6, "web_cookie_explicit": 4, "web_cookie_selector": 145, "wrong_role": 55, "transport_blocked": 43, "bearer_only": 43, "source_uncertain": 0, "active_mappings": 198}
PASS
```

Link checker: **PASS**, 49 Markdown files / 6,349 local links / 0 errors. `git diff --check`: **PASS**. Backend unit/API/SQL, browser Web E2E, deployment and external integration tests: **NOT_RUN**.

## Root cause and self-review

C01 treated the catalog actor string `Anonymous/credential` as if it were an application role and treated catalog metadata=false as Bearer-only even when the controller explicitly allowed anonymous bootstrap or selected `RoadGuardWeb`. That produced false positives for the five unique WebAuth endpoints above. C02 corrects the documentation/validator logic; it does not modify the Phase 2C OpenAPI artifact or production code.

**Self-review: PASS for source-based WebAuth correction and regression validator.** Independent JEV should review the 43 remaining Backend transport gaps, the metadata/selector contract, and whether the Web product needs additional owner-approved endpoints.

**STOP after C02. Phase 3B/3C not started.**
