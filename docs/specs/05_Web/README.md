# Web Supervisor & Project Manager integration handoff

**Phase 3A · baseline `c2b5945d57800fb0e557151bdbf83b60639adcb8` · branch `huy-review` · independent JEV pending.**

This package defines the proposed browser information architecture and API integration handoff for Supervisor and Project Manager. Supervisor/PM are Web actors; Reporter, Operator and Repair Crew remain Mobile React Native + Expo. Reporter intake is not turned into a mandatory Web reporting portal.

## Reading order

1. [Architecture and browser auth](01_Web-Architecture-and-Auth.md)
2. [Supervisor screen/API matrix](02_Supervisor-Screen-API-Matrix.md)
3. [PM screen/API matrix](03_PM-Screen-API-Matrix.md)
4. [Business flows](04_Web-Business-Flows.md)
5. [MapLibre/GIS boundary](05_GIS-MapLibre-Integration.md)
6. [Errors and state](06_Web-Errors-and-State-Handling.md)
7. [Acceptance checklist](07_Web-Integration-Acceptance-Checklist.md)
8. [Phase 3A review](PHASE3A_REVIEW_REPORT.md)
9. [Phase 3A-C01 role/transport correction](PHASE3A_C01_REVIEW_REPORT.md)
10. [Phase 3A-C02 WebAuth transport correction](PHASE3A_C02_REVIEW_REPORT.md)

## Evidence and limits

Backend source and Phase 2C contracts are the implementation evidence. These pages do not claim a Web repository was inspected, do not change API/DTO/OpenAPI, and do not mark browser E2E as passed. UI labels, route grouping and component boundaries are `PROPOSED_WEB_UI`; BE authorization, DTO validation, concurrency and lifecycle gates remain authoritative.

Coverage uses current source counts (47 controllers, 241 operations, 223 paths, `/health` separate) and links the exact API IDs instead of duplicating the catalog. Existing P1/P2 findings remain open.


**Contract rule.** Every API reference below links to the single primary entry in the [full API catalog](../04_API-Contracts/02_Full-API-Catalog.md). The catalog is authoritative for exact method, route, parameters, DTO/schema, headers, K/version, response and source locator. This chapter defines proposed Web presentation and orchestration; it does not create a route or grant a role.

For every screen, FE must bind fields from the response DTO and request fields from the request DTO exactly as catalogued. “DTO fields” means the named schema properties in the catalog; no unlisted field, enum, status or local authority is assumed. `CURRENT_IMPLEMENTED_BE` means source-backed route/guard; `PROPOSED_WEB_UI` means UI composition; `NOT_VERIFIED_WEB_E2E` means no Web client runtime was supplied.


**C01 correction:** the screen matrices include a source-derived role/transport adjudication appendix and a rerunnable [validator](tools/validate_phase3a_c01.py). Wrong-role references are removed from active screen commands; actor-compatible Bearer-only references remain visible as Backend integration gaps. **C02 correction:** direct WebAuth source evidence reclassifies anonymous bootstrap and explicit RoadGuardWeb endpoints; remaining Bearer-only transport gaps are listed in the [C02 report](PHASE3A_C02_REVIEW_REPORT.md). **STOP after C02;** Phase 3B/3C and React/TypeScript implementation are not started.
