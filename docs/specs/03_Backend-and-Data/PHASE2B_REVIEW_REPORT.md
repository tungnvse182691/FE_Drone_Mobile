# Phase 2B review — Backend and Data

**15/10/2026 · Phase 2A PASS for documentation scope; Phase 2B authorized. Independent JEV review: PENDING.** [Canonical entrance](../README.md) · [Phase 2A workflows](../02_Business-Workflows/README.md).

## Baseline, writer và scope

Repository `HoangAnhVu2207/RoadGuardSystem`, branch `huy-review`, approved base/source pin **`1b577d703cda203c6066eba98ff005341739849e`**. Initial fetch confirmed local/origin ahead/behind 0/0. Root Codex is the sole writer. Phase 0 source/API/EF metadata is reused only after rechecking **1334 source file hashes** against its recorded inventory (`6fdd98d98b41311e3af07a7b8cb95c55d8d62bc5` implementation checkpoint). No new live SQL capture, migration application or business test PASS inferred.

Delivery contains seven technical chapters plus this report, and necessary canonical README/governance03–05 navigation/status/crosswalk changes. Backend source, schema/database, migrations, tests, OpenAPI, contract locks, existing Phase 2A files and older docs remain unchanged. Seven pre-existing untracked audit/Reporter/Expo handoff inputs are preserved/excluded from commit. No consumer UI/native/provider implementation or Phase 2C work.

Exact delivery SHA is supplied in final chat after commit/push/remote equality check; embedding a commit's own SHA changes that SHA. Committed report can resolve its delivery by `git log -1 --format=%H -- docs/HoangHaiWarrantySystem-Official/03_Backend-and-Data/PHASE2B_REVIEW_REPORT.md`. Review diff with `git diff 1b577d703cda203c6066eba98ff005341739849e <delivery-sha> -- docs/HoangHaiWarrantySystem-Official` and `git show --stat <delivery-sha>`.

## Coverage and evidence

| Chapter | Covered source / metadata | Verification limit |
|---|---|---|
| [01 ASP.NET architecture](01_ASPNET-Architecture.md) | Composition/pipeline, Controller→Service→Repository convention and exceptions, DI lifetimes, ten module/workflow seams, correlation/ProblemDetails | 201 static registrations include conditions/composition calls; not runtime instantiated services |
| [02 Domain/data model](02_Domain-and-Data-Model.md) | All 196 EF entries / 191 tables; owned/table-sharing, selected exact columns/FKs/checks/unique indexes, rowversion, spatial, immutability/provenance and migration SQL overlay outside EF counts | Retained disconnected model + unchanged source/config; not live schema/data/plan/upgrade verification |
| [03 Auth/security](03_Authentication-Authorization-and-Security.md) | Cookie selector/CSRF/renewal/finite ticket, Mobile bearer/refresh/current session, resource rights, K/versions/optional receipt guard, evidence/privacy/security gaps | Mechanisms source verified, native/current deployed auth and exploit reproduction NOT_VERIFIED |
| [04 Files/uploads](04_File-Storage-and-Upload.md) | Local/S3/artifact adapter split; metadata/scope/session; multipart complete/read/checksum/MIME/recovery/fence; size/type/purpose, private evidence/retention | Source supports these seams, not actual MinIO/large-video/worker durability/restore acceptance |
| [05 Jobs/integration](05_Background-Jobs-and-Integration-Boundaries.md) | Seven workers and conditional registration, H6/legacy/static consumers, outbox/leases/retry/error classes, AI service auth/compatibility callback/synthetic boundary | No real FastAPI provider/YOLO E2E claim; callback fencing gap preserved |
| [06 Offline backend](06_Offline-Backend-Architecture.md) | Public-key custody, canonical signed batch, snapshots/current rights, per-item effect/receipt, conflict/reconcile/handover/key loss/source retention | Reference .NET crypto isn't native Expo/Keystore/local SQLCipher implementation |
| [07 Config/deployment](07_Backend-Configuration-and-Deployment-Boundaries.md) | Actual Options names/types, explicit flags/composition, SQL validation/logging/secrets boundaries, worker/storage/auth dependencies, backup assumptions | No secret values copied; target SLO/RPO/RTO isn't measured acceptance; no deploy/backup executed |

Current source inventory remains **47 controllers / 241 operations / 223 paths** (health separate). Exact API/DTO/wire details stay in [full inventory](../../audit/HHWS-DOCS-REBUILD-01/02_FULL_API_INVENTORY.md) and the ten Phase 2A workflow appendices, not reinvented as a Phase 2C schema. Technical chapters preserve links to all ten workflows; business decision precedence remains [authority/governance](../00_Governance/01_Authority-and-Source-of-Truth.md).

EF snapshot metrics: 1945 property mappings / 1940 physical columns, relational keys219/FKs657/indexes692/checks229; 48 entity concurrency-property mappings. Counts are metadata scopes, not counts of business aggregates, performance effectiveness or deployed constraints. Two current model migrations are source-discovered, not a claim all historical databases have already upgraded. Selected field/FK/index/check and Options rows are machine-compared against retained metadata/type index before delivery.

## Source baseline and key locators

All source line links at approved base `1b577d703cda203c6066eba98ff005341739849e`. Chapter evidence sections give class/method declarations and indexes. Metadata is pinned to this base by Git equality plus source hash carry-forward; JSON is an existing source-derived artifact, not manually recreated DDL.

- [Program.cs](../../../RoadGuardSystem.API/Program.cs#L19): host composition, conditional workers, middleware/health/controllers.
- [ServiceCollectionExtensions.cs](../../../RoadGuardSystem.API/Extensions/ServiceCollectionExtensions.cs#L41): AddApiPlatformServices/auth/DI/policies/errors/workers.
- [RoadGuardPersistenceExtensions.cs](../../../RoadGuardSystem.Repositories/Extensions/RoadGuardPersistenceExtensions.cs#L32): persistence/options/adapters/DbContext provider composition.
- [RoadGuardDbContext.cs](../../../RoadGuardSystem.Repositories/RoadGuardDbContext.cs#L181): OnModelCreating; SaveChanges validation beginning L208.
- [RowVersionConvention.cs](../../../RoadGuardSystem.Repositories/Concurrency/RowVersionConvention.cs#L5): named byte[] RowVersion convention, not every entity.
- [EF JSON](../../RoadGuard-Backend-Official/04_Database/ef-model.json), [source/DI index](../../RoadGuard-Backend-Official/10_Traceability/source-inventory.json), [API index](../../RoadGuard-Backend-Official/10_Traceability/api-source-map.json): exact retained generated metadata.
- [Owner decisions](../../product/confirmed-decisions.md), [latest HUY integration](../../../planning/development/HUY-FINAL-INTEGRATION.md): expected behavior/qualifiers; historical embedded checkpoints don't become Phase 2B runtime evidence.

## JEV carry-forward — no closure

Evidence below is current unchanged source at the approved base. Judgment applies to the specific finding, not an overall backend runtime verdict. [Phase 0 JEV register](../../audit/HHWS-DOCS-REBUILD-01/03_BUSINESS_AND_PLATFORM_CONFLICTS.md) retains original priority/disposition; no new exhaustive security audit claimed.

| Finding / Judgment | Evidence | Variance / impact | Recommendation |
|---|---|---|---|
| P1-01 / PARTIAL | [Processing dispatch L67](../../../RoadGuardSystem.Repositories/Implementations/Processing/ProcessingV2PersistenceService.cs#L67), [synthetic service L89](../../../RoadGuardSystem.Services/Implementations/Processing/Anh02/Anh02AiService.cs#L89) | Real provider/model/context/artifact transport expected; outbox and synthetic fixture do not prove FastAPI YOLO | AI+BE protocol/adoption/real model evidence separately; no provider route invented |
| P1-02 / PARTIAL | [ReceiveResultAsync L117–148](../../../RoadGuardSystem.Repositories/Implementations/Processing/ProcessingV2PersistenceService.cs#L117) | Attempt belongs-to-job exists; latest/active fence/full callback receipt binding partial. Runtime exploit NOT_VERIFIED | Bounded BE+AI compatibility design/late-out-of-order/replay tests before REAL acceptance |
| P1-03 / PARTIAL | [CandidateMatchingService L88–90](../../../RoadGuardSystem.Services/Implementations/Defects/CandidateMatchingService.cs#L88) | Metric location/distance unavailable while scope/neighbors/history implemented; no threshold inferred | Owner/data facts + bounded matcher work; not automatic new Defect |
| P1-04 / PARTIAL | [ReporterEvidenceService L160–187](../../../RoadGuardSystem.Services/Implementations/Files/ReporterEvidenceService.cs#L160), [ExportService.ContentAsync L130](../../../RoadGuardSystem.Services/Implementations/Exports/ExportService.cs#L130) | Reporter pre-storage check lacks equivalent post-await check used by export; risk, no reproduced leak claimed | Delayed-open tests/bounded guard-dispose follow-up; docs do not repair source |
| P1-05 / NOT_VERIFIED | [External gates](../../audit/HHWS-DOCS-REBUILD-01/05_OPEN_DECISIONS_AND_GAPS.md), [Program worker gates L25](../../../RoadGuardSystem.API/Program.cs#L25) | Actual Web/Expo/device keys/local encryption/video/model/MinIO/SMTP/GIS/deployment/SLO/restore not verified; source registration ≠ liveness/readiness | Consumer/ops acceptance pack; production upload verifier ownership explicitly verify, no scheduler invented |
| P2-06 / PARTIAL | [FT final producer L33–88](../../../RoadGuardSystem.Repositories/Implementations/Repairs/RepairWorkflowRepository.Producing.cs#L33), [adapter L252](../../../RoadGuardSystem.Repositories/Implementations/Messaging/H6RepairNotificationSourceAdapter.cs#L252) | FT PM confirmation/audit exists; expected Supervisor information has no adopted producer; not additional approval | Huy source-recipient/outbox/dedup/rollback follow-up without changing FT final authority |
| P2-07 / PARTIAL | [Case Apply L150–152](../../../RoadGuardSystem.Repositories/Implementations/Cases/CaseWorkflowRepository.cs#L150) | Localized pre-Defect FIELD/DRONE final conclusion gate; ExistingEvidence and Reporter→Defect→FIELD separate existing branches | Owner/BE producer assignment; no fake Survey/Defect and no blanket missing Reporter lifecycle claim |

P2-01..P2-05 governance/client wording, name/entrances, V2 draft lock, Swagger source-excerpt failure and old link debt remain in [status registry](../00_Governance/03_Implementation-and-Verification-Status.md). Navigation advances documentation only; no contract relock, old-doc replacement or test-failure closure. **New confirmed GAPs: 0** in this docs-only scope; deployment verifier conditions/metadata nuances are documented observations under existing gates, not reproduced production incidents.

## Decisions and not-verified boundaries

No new owner business decision is required to publish these source-backed docs. Remaining dependent acceptance: real-provider protocol/model/context/artifact distribution; authoritative CRS/coverage; deployed verifier/worker/storage/TLS/keyring/backup behavior; native Expo local encryption/secure key/queue/crypto interoperability and approved key-loss/recovery policy; deferred ND01 additional FT data after original-window expiry. These do not authorize implementation or default acceptance. ECDSA does not prove a real person or historic UTC; encrypted handover does not prove encrypted local SQLite/photos.

## Actual verification / tests

| Command / check | Phase 2B evidence |
|---|---|
| `python docs/HoangHaiWarrantySystem-Official/tools/check_links.py` | PASS: 27 Markdown files / 1837 local links / 0 errors; 0 external URLs checked. Local targets/headings only, not runtime |
| Temporary `hhws_phase2b_verify.py` outside repo: source line/symbol/type and exact EF/Options rows, API route references, all ten workflows, metadata pin/hashes/preservation/scope; checker positive/negative controls | PASS: 392 source-line references in bounds (354 indexed type and 21 indexed method references); 196 entity / 50 column / 26 FK / 22 index-check / 50 Options property rows exact; all ten workflows linked; 8 checker controls; 1334 source hashes unchanged; 3 metadata artifacts pinned; 12 Phase2A files + 7 pre-existing inputs unchanged; 0 unpublished targets |
| `git diff --check` / `git diff --cached --check` / exact staged allowlist | PASS: unstaged/staged whitespace checks exit0; exact staged allowlist 12 Markdown files (8 new + 4 canonical updates), 1005 insertions / 33 deletions; no unstaged tracked change; approved branch/base and origin0/0 |
| Backend build/unit/API/SQL tests, live EF/SQL capture or migrations | **NOT_RUN**: docs-only, source unchanged; no runtime/environment repair authorized |
| Real Web/Expo/FastAPI/MinIO/SMTP/CRS/SLO/backup/restore/native crypto acceptance | **NOT_RUN / NOT_VERIFIED** |

Known test failures stay **HISTORICAL**: Phase 0 focused API/OpenAPI 16 PASS/1 FAIL/0 SKIP, ManualSwaggerContractTests SWG-014 source-excerpt assertion; V2 check_contracts.py/validate_package.py exit1 CONTRACT_LOCK_MISMATCH (later assertions not reached). Other residual hosted CI/fixture/architecture failures recorded in the latest HUY specification retain their historical scope and remain unclosed; earlier HUY/Reporter results retain their recorded SHA/date; no new suite PASS, skip or CI result invented. Phase 0 Docker absence is a historical environment observation, not a current environment check here.

## Self-review and stop

Pass 1 checks architecture against actual composition/callers, EF exact metadata versus business prose, temporal auth/receipt guards, storage verification/recovery and AI/offline provenance. Corrected the draft artifact-store wording to actual MinIO registration with temporary spool (no durable local fallback), and added migration-only FKs/index/triggers outside EF counts. Specific distinctions kept: optional receipt guard ≠ universal revalidation; conditional verifier ≠ deployed worker; synthetic analysis ≠ real YOLO; owned EF entries ≠ extra SQL tables; rowversion/ETag/K/signature aren't interchangeable.

Pass 2 checks allowed diff, old/Phase 2A source preservation, all ten workflow cross-links, exact schema/config/source locators and checker controls; fixes in-scope docs only and reruns affected checks. This is root Codex self-review, **not independent JEV**. Source/runtime/contract failures remain open.

**STOP after Phase 2B push. Independent JEV review PENDING; Phase 2C NOT_STARTED.**
