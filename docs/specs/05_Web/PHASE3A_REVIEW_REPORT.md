# Phase 3A review report — Web Supervisor & PM handoff

**Baseline `c2b5945d57800fb0e557151bdbf83b60639adcb8` · branch `huy-review` · independent JEV pending.**

## Deliverables and coverage

| File | Coverage |
|---|---|
| README | Scope, reading order, evidence labels and limits |
| 01 Web architecture/auth | Cookie/CSRF/session/renew/logout, protected routes, cache, pagination, K/version |
| 02 Supervisor matrix | 10 screen contracts; Supervisor triage, approvals, publication, operations |
| 03 PM matrix | 13 screen contracts; GIS, candidates, survey, FIELD, NORMAL, FT, case, offline |
| 04 flows | Auth, Reporter→Supervisor→PM, Crew handoff, NORMAL and FT boundaries |
| 05 GIS | Draft/publish/CRS/sections/versions/slabs/MapLibre proposal; image segmentation boundary |
| 06 errors | ProblemDetails, 401/403/404/409/412/428/429, unknown outcome and K replay |
| 07 acceptance | 14 future Web E2E scenarios with required evidence |

## Quantitative/source coverage

Screen matrices contain **23 proposed Web screens** (10 Supervisor, 13 PM), referencing the Phase 2C catalog's exact API IDs/routes. Shared API references are intentionally linked once in the catalog rather than copied. Coverage spans authentication, users/memberships, projects/GIS, cases, candidates/Defects, surveys/processing, FIELD, NORMAL/FT, notifications, reporting, retention, publication and offline coordination. The package uses the current counts 47 controllers / 241 operations / 223 paths / 357 schemas; `/health` remains separate.

Evidence sources: [actor/client matrix](../01_Product-and-Roles/02_Actor-Client-Permission-Matrix.md), [10 workflows](../02_Business-Workflows/README.md), [Backend/Data Phase 2B](../03_Backend-and-Data/PHASE2B_REVIEW_REPORT.md), [API catalog](../04_API-Contracts/02_Full-API-Catalog.md), [DTO reference](../04_API-Contracts/03_DTO-and-Schema-Reference.md), and current source locators linked from each API entry. Pinned source/base is `c2b5945d57800fb0e557151bdbf83b60639adcb8`; this package did not inspect a separate Web repository.

## Assumptions and gaps

`PROPOSED_WEB_UI`: screen grouping, browser router, MapLibre, loading/empty/partial states, cache invalidation and role-aware navigation. `CURRENT_IMPLEMENTED_BE`: route/DTO/guard/ProblemDetails/K/version evidence in Phase 2C. `SOURCE_GAP`: existing P1-01 through P1-05 and P2-06/P2-07 remain open. `NOT_VERIFIED_WEB_E2E`: browser cookie behavior, MapLibre/CRS rendering, accessibility, uploads, deployed storage/SMTP/GIS/AI, real provider and all user journeys. No Web permission is inferred from a visible button.

## Checks

- Source-reference/API IDs and route references were generated from the Phase 2C catalog; no new endpoint or DTO was invented.
- Local Markdown link checker: PASS, 47 Markdown files / 5,980 local links / 0 errors; external URLs/runtime not checked.
- Source-reference/API ID validation: PASS, 9 Web files, 292 API references, 183 unique valid API IDs, all resolved to Phase 2C catalog entries.
- Scope/diff check: only `05_Web/` plus required canonical README/governance03–05 navigation/status files are in scope; source/API/OpenAPI/schema/tests untouched.
- Backend/Web/SQL/HTTP/E2E/provider tests: **NOT_RUN**.

**STOP after Phase 3A. Independent JEV review pending; Phase 3B/3C not started.**
