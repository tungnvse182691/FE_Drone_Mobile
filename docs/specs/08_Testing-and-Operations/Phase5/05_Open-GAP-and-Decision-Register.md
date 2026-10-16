# Open GAP and decision register

**Source baseline:** `d1e529a5d1b6a95fa18d9448f7d75468463390df` · `huy-review` · 15/10/2026. Documentation/static audit only; independent JEV **PENDING**.


**15 retained tracking entries: 12 Phase 0 records (5 P1 / 7 P2), plus Web transport, H3 flaky root cause and P5-G02 (3 P1).** Thus 0 P0 / 8 P1 / 7 P2 tracking records, not 15 newly reproduced bugs. No entry is closed by Phase 5. Operational/native subgates below are children of existing records and are not double counted. P5-G01 catalog metadata is corrected under F03 and is excluded from open implementation totals.

The first twelve entries retain their original severity and historical test outcomes. Historical FAIL is not a fresh Phase 5 test failure; later CI success does not itself close the registry record. Evidence at [Phase 0 findings](../../../audit/HHWS-DOCS-REBUILD-01/03_BUSINESS_AND_PLATFORM_CONFLICTS.md) and linked canonical chapters supplies original source paths/lines; current targeted source cross-checks are in this pack.

| ID / priority | Expected vs current evidence / Judgment | Owner / smallest follow-up and closure evidence |
|---|---|---|
| P1-01 | Real adopted provider; current Backend synthetic path and AI worker MockAIAdapter do not establish real YOLO integration. PARTIAL | BE+AI: adopt dispatch/callback/raw-result provenance, actual checkpoint classes/video/metrics and real authenticated callback proof |
| P1-02 | Latest active attempt + receipt identity fence expected; ProcessingV2PersistenceService.ReceiveResult currently validates membership/model/manifest but latest-active binding is partial. PARTIAL; exploit NOT_VERIFIED | BE+AI: scoped source fix and late/out-of-order/cross-job replay negative tests |
| P1-03 | Matching expected to use accepted location/accuracy/image facts; CandidateMatchingService L88–90 passes null distance / metricGpsAvailable false. PARTIAL | BE+owner: source facts/method decision and known/missing-GPS/image cases; PM retains decision |
| P1-04 | Reporter download current authority after awaited storage open; ReporterEvidenceService L160–187 lacks corresponding temporal recheck. PARTIAL risk; exploit NOT_VERIFIED | BE: delayed-open/revoke/owner/publication negative tests; preserve privacy/dispose semantics |
| P1-05 | Native/external/deployment acceptance; source and mocks available, client/device/provider operational acceptance absent. NOT_VERIFIED | Web+Expo+AI+Ops evidence pack; child gates below |
| P2-01 | Primary-client wording consistency; canonical Expo matrix correct, legacy ReporterWeb/Kotlin paragraphs preserved. Historical documentation debt, not closed | Docs owner: review legacy consumer adoption/migration without deleting working docs |
| P2-02 | Product/authority single entrance; canonical navigation corrected, old naming/module entrances preserved. Historical documentation debt | Owner/docs: scoped source-registry adoption; technical identifiers stay |
| P2-03 | Adopted current FE contract; V2 frozen draft/lock mismatch historical failure remains unadopted | BE+FE: explicit compatibility/adoption evidence; no automatic relock |
| P2-04 | Swagger source excerpt test failed at Phase 0; later baseline API CI succeeds, original finding retained HISTORICAL pending explicit disposition | Contract owner: compare CI recovery changes and exact targeted evidence; Phase5 does not rerun or auto close |
| P2-05 | Canonical links checked here; old document unresolved-link debt remains outside canonical scope | Docs owner: historical target disposition separately; no bulk archive/delete |
| P2-06 | FT final Supervisor informational producer; RepairWorkflowRepository.Producing / H6RepairNotificationSourceAdapter still partial | BE messaging: recipient/outbox/dedup/rollback proof; no added Supervisor FT approval |
| P2-07 | Pre-Defect FIELD/DRONE Case conclusion returns source_not_ready; ExistingEvidence and Reporter→Defect→FIELD still supported | BE+owner: localized producer implementation when assigned; no fake Survey |
| WEB-T01 / P1 | Browser cookie access for active Web operations; 43 mappings/40 APIs still Bearer-only by C02/source. BLOCKED | BE+Web: approved cookie/CSRF or adapter design with authorization regression; no token workaround inferred |
| H3-R01 / P1 | Deterministic FIELD HTTP authorization test; prior flaky failure then CI rerun PASS, root cause NOT_VERIFIED | BE tests: controlled clock/current authority/fixture isolation with reproducible failing/passing trace; do not change expected 403 without business proof |
| P5-G02 / P1 | Assigned Crew current repair read/version/attempt bootstrap; PM-only API-141/148 cannot supply it. NOT_VERIFIED | BE+Expo: trace existing producers/read models first; [bounded evidence](04_Workflow-and-Evidence-Traceability.md#p5-g02--crew-repair-readbootstrap-verification) |

## External/operational child gates (not extra counted findings)

| Parent | Boundary / current evidence | Closure gate |
|---|---|---|
| P1-05 | Production upload verification worker topology/configuration not observed; complete may remain unverified | Real deployment file progresses complete→VERIFIED or deterministic failure, retries/recovery and logs/checksum/scope proof |
| P1-05 | SecureStore/Keystore/SQLCipher/equivalent/file encryption, temp files/EXIF/cache/backups/logout not verified | Android native build, device filesystem inspection and key lifecycle/threat tests; Backend handover encryption is insufficient |
| P1-05 | SMTP/MinIO/FCM delivery/connectivity/credentials not tested | Real services authenticated, scoped URLs/retries/revocation/notification recipient proof; no test PASS from adapters |
| P1-01/P1-05 | Real YOLO weights/evaluation/class mapping/deployment absent from worker adoption proof | Actual artifact/version/hash, class metrics and representative video/SRT/GPS callback provenance |
| P1-05 | Web/Expo full journey, deployment/backup/restore and iOS readiness absent | Actual repository/build/deployment evidence and end-to-end trace; source CI only covers its lanes |

## Owner checkpoints

Already confirmed and not reopened: client platform split, independent Reporter intake, PM Defect authority, Crew physical measurement, NORMAL/FT authority split, GIS/image segmentation distinction, no SfM/orthomosaic/DSM/3D/AI physical measurement.

Before dependent implementation: assign owners and approve bounded Web cookie/CSRF compatibility; adopt real AI protocol/model/source credentials; choose native encrypted-storage/key-loss/uninstall/backup policy; confirm any missing repair bootstrap contract only after existing-source trace; assign localized Case producer/FT notification follow-up. Missing device/provider/deployment evidence is an acceptance input, not permission to invent business behavior. Independent JEV must review the documentation corrections before release claims.
